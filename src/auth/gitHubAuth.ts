import { AuthenticationSession, authentication } from "vscode";
import { Errorable, failed, getErrorMessage } from "../commands/utils/errorable";
import { Octokit } from "@octokit/rest";

export async function getGitHubClient(scopes: string[]): Promise<Errorable<Octokit>> {
    const session = await getGitHubAuthenticationSession(scopes);
    if (failed(session)) {
        return session;
    }

    const client = new Octokit({
        auth: `token ${session.result.accessToken}`,
    });

    return { succeeded: true, result: client };
}

async function getGitHubAuthenticationSession(scopes: string[]): Promise<Errorable<AuthenticationSession>> {
    try {
        const session = await authentication.getSession("github", scopes, { createIfNone: true });
        return { succeeded: true, result: session };
    } catch (e) {
        return { succeeded: false, error: `Failed to get GitHub authentication session: ${getErrorMessage(e)}` };
    }
}
