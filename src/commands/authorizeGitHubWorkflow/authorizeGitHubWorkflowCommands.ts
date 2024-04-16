import { WorkspaceFolder, commands, window, workspace } from "vscode";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { getReadySessionProvider } from "../../auth/azureAuth";
import { failed } from "../utils/errorable";
import { ReadyAzureSessionProvider } from "../../auth/types";
import { AuthenticationProvider, Client as GraphClient } from "@microsoft/microsoft-graph-client";
import { getMicrosoftGraphClientBaseUrl } from "../utils/azureAccount";
import { getGitHubClient } from "../../auth/gitHubAuth";
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { GitHubRepo, InitialSelection } from "../../webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import {
    AuthorizeGitHubWorkflowDataProvider,
    AuthorizeGitHubWorkflowPanel,
} from "../../panels/AuthorizeGitHubWorkflowPanel";
import { getExtension } from "../utils/host";
import { getGitApi } from "../utils/git";
import { Remote } from "../../types/git";

export type AuthorizeGitHubWorkflowParams = {
    workspaceFolder?: WorkspaceFolder;
    initialSelection: InitialSelection;
};

export function launchAuthorizeGitHubWorkflowCommand(params: AuthorizeGitHubWorkflowParams) {
    commands.executeCommand("aks.authorizeGitHubWorkflow", params);
}

export async function authorizeGitHubWorkflow(
    _context: IActionContext,
    params?: AuthorizeGitHubWorkflowParams,
): Promise<void> {
    const workspaceFolder = await getWorkspaceFolder(params?.workspaceFolder);
    if (!workspaceFolder) {
        return;
    }

    const extension = getExtension();
    if (failed(extension)) {
        window.showErrorMessage(extension.error);
        return;
    }

    const sessionProvider = await getReadySessionProvider();
    if (failed(sessionProvider)) {
        window.showErrorMessage(sessionProvider.error);
        return;
    }

    const graphClient = createGraphClient(sessionProvider.result);

    const octokit = await getGitHubClient(["repo", "secrets:read", "secrets:write"]);
    if (failed(octokit)) {
        window.showErrorMessage(octokit.error);
        return;
    }

    const gitApi = getGitApi();
    if (failed(gitApi)) {
        window.showErrorMessage(gitApi.error);
        return;
    }

    const workspaceRepository = await gitApi.result.openRepository(workspaceFolder.uri);
    if (!workspaceRepository) {
        window.showErrorMessage("The workspace is not a git repository.");
        return;
    }

    const reposFromRemotes = await Promise.all(
        workspaceRepository.state.remotes.map((r) => getRepo(octokit.result, r)),
    );
    const accessibleRepos = reposFromRemotes.filter((f) => f !== null) as GitHubRepo[];

    const panel = new AuthorizeGitHubWorkflowPanel(extension.result.extensionUri);
    const dataProvider = new AuthorizeGitHubWorkflowDataProvider(
        sessionProvider.result,
        graphClient,
        octokit.result,
        accessibleRepos,
        params?.initialSelection || {},
    );
    panel.show(dataProvider);
}

async function getWorkspaceFolder(suppliedWorkspaceFolder?: WorkspaceFolder): Promise<WorkspaceFolder | null> {
    let workspaceFolder: WorkspaceFolder;
    if (suppliedWorkspaceFolder) {
        workspaceFolder = suppliedWorkspaceFolder;
    } else {
        if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
            window.showErrorMessage("You must have a workspace open to run this command.");
            return null;
        }

        workspaceFolder = workspace.workspaceFolders[0];
        if (workspace.workspaceFolders.length > 1) {
            const pickResult = await window.showWorkspaceFolderPick({
                placeHolder: "Select a workspace folder to run this command.",
            });
            if (!pickResult) return null;
            workspaceFolder = pickResult;
        }
    }

    return workspaceFolder;
}

function createGraphClient(sessionProvider: ReadyAzureSessionProvider): GraphClient {
    // The "Visual Studio Code" application (aebc6443-996d-45c2-90f0-388ff96faa56) does not have delegated
    // permission to call the Microsoft Graph endpoints required here. We need to use a different application ID.
    // TODO: This is the "Visual Studio" client ID. We should instead be using our own first party application.
    const applicationId = "04f0c124-f2bc-4f59-8241-bf6df9866bbd";
    const authProvider: AuthenticationProvider = {
        getAccessToken: async (options) => {
            const scopes = options?.scopes || [];
            const session = await sessionProvider.getAuthSession({ scopes, applicationClientId: applicationId });
            return session.succeeded ? session.result.accessToken : "";
        },
    };

    return GraphClient.initWithMiddleware({
        baseUrl: getMicrosoftGraphClientBaseUrl(),
        authProvider: authProvider,
    });
}

async function getRepo(octokit: Octokit, remote: Remote): Promise<GitHubRepo | null> {
    const url = remote.fetchUrl || remote.pushUrl;
    if (!url) {
        return null;
    }

    const [owner, repo] = url
        .replace(/\.git$/, "")
        .split("/")
        .slice(-2);
    let response: RestEndpointMethodTypes["repos"]["get"]["response"];
    try {
        response = await octokit.repos.get({ owner, repo });
    } catch (e) {
        return null;
    }

    return {
        forkName: remote.name,
        url,
        gitHubRepoOwner: response.data.owner.login,
        gitHubRepoName: response.data.name,
        isFork: response.data.fork,
        defaultBranch: response.data.default_branch,
    };
}
