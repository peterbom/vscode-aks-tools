import {
    GitHubRepoSecret,
    GitHubRepoSecretState,
} from "../../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { newLoaded, newLoading } from "../../../utilities/lazy";
import { GitHubRepositoryReferenceData } from "../stateTypes";

export function setBranchesLoading(data: GitHubRepositoryReferenceData): GitHubRepositoryReferenceData {
    return {
        ...data,
        branches: newLoading(),
    };
}

export function updateBranches(data: GitHubRepositoryReferenceData, branches: string[]): GitHubRepositoryReferenceData {
    return {
        ...data,
        branches: newLoaded(branches),
    };
}

export function setSecretLoading(
    data: GitHubRepositoryReferenceData,
    secret: GitHubRepoSecret,
): GitHubRepositoryReferenceData {
    return {
        ...data,
        secretState: {
            ...data.secretState,
            [secret]: newLoading(),
        },
    };
}

export function updateSecretState(
    data: GitHubRepositoryReferenceData,
    secretState: GitHubRepoSecretState,
): GitHubRepositoryReferenceData {
    return {
        ...data,
        secretState: {
            AZURE_CLIENT_ID: newLoaded(secretState.AZURE_CLIENT_ID),
            AZURE_TENANT_ID: newLoaded(secretState.AZURE_TENANT_ID),
            AZURE_SUBSCRIPTION_ID: newLoaded(secretState.AZURE_SUBSCRIPTION_ID),
        },
    };
}
