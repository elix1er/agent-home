import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export type IssueState = "open" | "closed";

export interface TaskIssue {
  number: number;
  title: string;
  body: string;
  state: IssueState;
  labels: string[];
  htmlUrl: string;
  updatedAt: string;
}

export interface IssueGateway {
  create(input: { title: string; body: string; labels: string[] }): Promise<TaskIssue>;
  get(number: number): Promise<TaskIssue>;
  list(input: { state: "open" | "closed" | "all"; labels?: string[] }): Promise<TaskIssue[]>;
  update(number: number, input: { state?: IssueState; labels?: string[] }): Promise<TaskIssue>;
  comment(number: number, body: string): Promise<void>;
}

function normalizeIssue(issue: {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  labels: Array<string | { name?: string | null }>;
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
}): TaskIssue {
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state === "closed" ? "closed" : "open",
    labels: issue.labels.flatMap((label) => typeof label === "string" ? [label] : label.name ? [label.name] : []),
    htmlUrl: issue.html_url,
    updatedAt: issue.updated_at,
  };
}

export class GitHubIssueGateway implements IssueGateway {
  private readonly octokit: Octokit;

  constructor(
    private readonly owner: string,
    private readonly repo: string,
    token = process.env.GITHUB_TOKEN,
  ) {
    const appId = process.env.GITHUB_APP_ID?.trim();
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const appValues = [appId, installationId, privateKey];
    if (token && appValues.some(Boolean)) {
      throw new Error("Configure a GitHub App or GITHUB_TOKEN, not both");
    }
    if (appValues.some(Boolean) && !appValues.every(Boolean)) {
      throw new Error("GitHub App configuration is incomplete");
    }
    if (appId && installationId && privateKey) {
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId, installationId, privateKey },
      });
    } else if (token) {
      this.octokit = new Octokit({ auth: token });
    } else {
      throw new Error("Configure either a GitHub App or GITHUB_TOKEN in this deployment");
    }
  }

  async create(input: { title: string; body: string; labels: string[] }): Promise<TaskIssue> {
    const { data } = await this.octokit.issues.create({ owner: this.owner, repo: this.repo, ...input });
    return normalizeIssue(data);
  }

  async get(number: number): Promise<TaskIssue> {
    const { data } = await this.octokit.issues.get({ owner: this.owner, repo: this.repo, issue_number: number });
    if ("pull_request" in data) throw new Error(`#${number} is a pull request, not an agent task`);
    return normalizeIssue(data);
  }

  async list(input: { state: "open" | "closed" | "all"; labels?: string[] }): Promise<TaskIssue[]> {
    const items = await this.octokit.paginate(this.octokit.issues.listForRepo, {
      owner: this.owner,
      repo: this.repo,
      state: input.state,
      labels: input.labels?.join(","),
      per_page: 100,
      sort: "updated",
      direction: "desc",
    });
    return items.filter((item) => !("pull_request" in item)).map(normalizeIssue);
  }

  async update(number: number, input: { state?: IssueState; labels?: string[] }): Promise<TaskIssue> {
    const { data } = await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: number,
      ...input,
    });
    return normalizeIssue(data);
  }

  async comment(number: number, body: string): Promise<void> {
    await this.octokit.issues.createComment({ owner: this.owner, repo: this.repo, issue_number: number, body });
  }
}
