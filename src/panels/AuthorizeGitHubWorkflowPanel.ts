import { Uri, window } from "vscode";
import { BasePanel, PanelDataProvider } from "./BasePanel";
import { MessageHandler, MessageSink } from "../webview-contract/messaging";
import { TelemetryDefinition } from "../webview-contract/webviewTypes";
import { ReadyAzureSessionProvider } from "../auth/types";
import {
    AcrKey,
    AcrRoleDefinition,
    AcrRoleDefinitionKey,
    AcrRoleDefinitionName,
    ClusterKey,
    ClusterRoleDefinition,
    ClusterRoleDefinitionKey,
    ClusterRoleDefinitionName,
    EntraIdApplication,
    EntraIdApplicationKey,
    GitHubRepo,
    GitHubRepoKey,
    GitHubRepoSecret,
    GitHubRepoSecretState,
    InitialSelection,
    InitialState,
    ServicePrincipal,
    ServicePrincipalKey,
    Subscription,
    SubscriptionKey,
    ToVsCodeMsgDef,
    ToWebViewMsgDef,
    acrPushRoleDefinitionName,
    acrRoleLookup,
    aksClusterUserRoleDefinitionName,
    clusterRoleLookup,
    contributorRoleDefinitionName,
} from "../webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { Octokit } from "@octokit/rest";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";
import {
    createApplication,
    createFederatedIdentityCredential,
    createServicePrincipal,
    deleteApplication,
    deleteFederatedIdentityCredential,
    findFederatedIdentityCredential,
    getCurrentUserId,
    getFederatedIdentityCredentials,
    getOwnedApplications,
    getServicePrincipalsForApp,
} from "../commands/utils/graph";
import { Errorable, failed, getErrorMessage, succeeded } from "../commands/utils/errorable";
import { SelectionType, getSubscriptions } from "../commands/utils/subscriptions";
import { getResources } from "../commands/utils/azureResources";
import { getAuthorizationManagementClient } from "../commands/utils/arm";
import { RoleAssignment } from "@azure/arm-authorization";
import {
    createRoleAssignment,
    deleteRoleAssignment,
    getPrincipalRoleAssignmentsForAcr,
    getPrincipalRoleAssignmentsForCluster,
    getScopeForAcr,
    getScopeForCluster,
} from "../commands/utils/roleAssignments";
import { createGitHubSecret, deleteGitHubSecret, getRepoPublicKey } from "../commands/utils/gitHub";

export class AuthorizeGitHubWorkflowPanel extends BasePanel<"authorizeGitHubWorkflow"> {
    constructor(extensionUri: Uri) {
        super(extensionUri, "authorizeGitHubWorkflow", {
            // Reference data responses
            getBranchesResponse: null,
            getOwnedApplicationsResponse: null,
            getServicePrincipalsResponse: null,
            getSubscriptionsResponse: null,
            getAcrsResponse: null,
            getClustersResponse: null,

            // Federated identity credentials responses
            getPullRequestFederatedCredentialResponse: null,
            getBranchFederatedCredentialResponse: null,
            createPullRequestFederatedCredentialResponse: null,
            createBranchFederatedCredentialResponse: null,
            deletePullRequestFederatedCredentialResponse: null,
            deleteBranchFederatedCredentialResponse: null,

            // GitHub repo secrets responses
            getRepoSecretsResponse: null,
            updateRepoSecretResponse: null,
            deleteRepoSecretResponse: null,

            // Azure resource role assignment responses
            getAcrRoleAssignmentsResponse: null,
            getClusterRoleAssignmentsResponse: null,
            createAcrRoleAssignmentResponse: null,
            createClusterRoleAssignmentResponse: null,
            deleteAcrRoleAssignmentResponse: null,
            deleteClusterRoleAssignmentResponse: null,

            // Application responses
            createEntraIdApplicationResponse: null,
            deleteEntraIdApplicationResponse: null,
        });
    }
}

const defaultSecretState: GitHubRepoSecretState = {
    AZURE_CLIENT_ID: false,
    AZURE_SUBSCRIPTION_ID: false,
    AZURE_TENANT_ID: false,
};

export class AuthorizeGitHubWorkflowDataProvider implements PanelDataProvider<"authorizeGitHubWorkflow"> {
    constructor(
        readonly sessionProvider: ReadyAzureSessionProvider,
        readonly graphClient: GraphClient,
        readonly octokit: Octokit,
        readonly gitHubRepos: GitHubRepo[],
        readonly initialSelection: InitialSelection,
    ) {}

    getTitle(): string {
        return "Authorize GitHub Workflow";
    }

    getInitialState(): InitialState {
        return {
            repos: this.gitHubRepos,
            tenantId: this.sessionProvider.selectedTenant.id,
            initialSelection: this.initialSelection,
        };
    }

    getTelemetryDefinition(): TelemetryDefinition<"authorizeGitHubWorkflow"> {
        return {
            // Reference data requests
            getBranchesRequest: false,
            getOwnedApplicationsRequest: false,
            getServicePrincipalsRequest: false,
            getSubscriptionsRequest: false,
            getAcrsRequest: false,
            getClustersRequest: false,

            // Federated identity credentials requests
            getPullRequestFederatedCredentialRequest: false,
            getBranchFederatedCredentialRequest: false,
            createPullRequestFederatedCredentialRequest: true,
            createBranchFederatedCredentialRequest: true,
            deletePullRequestFederatedCredentialRequest: true,
            deleteBranchFederatedCredentialRequest: true,

            // GitHub repo secrets requests
            getRepoSecretsRequest: false,
            updateRepoSecretRequest: (args) => `updateRepoSecret_${args.secret}`, // Capture the name of the secret (not the value)
            deleteRepoSecretRequest: (args) => `deleteRepoSecret_${args.secret}`,

            // Azure resource role assignment requests
            getAcrRoleAssignmentsRequest: false,
            getClusterRoleAssignmentsRequest: false,
            createAcrRoleAssignmentRequest: true,
            createClusterRoleAssignmentRequest: true,
            deleteAcrRoleAssignmentRequest: true,
            deleteClusterRoleAssignmentRequest: true,

            // Resource creation requests
            createEntraIdApplicationRequest: true,
            deleteEntraIdApplicationRequest: true,
        };
    }

    getMessageHandler(webview: MessageSink<ToWebViewMsgDef>): MessageHandler<ToVsCodeMsgDef> {
        return {
            // Reference data requests
            getBranchesRequest: (args) => this.handleGetBranchesRequest(args, webview),
            getOwnedApplicationsRequest: () => this.handleGetOwnedApplicationsRequest(webview),
            getServicePrincipalsRequest: (args) => this.handleGetServicePrincipalsRequest(args, webview),
            getSubscriptionsRequest: () => this.handleGetSubscriptionsRequest(webview),
            getAcrsRequest: (args) => this.handleGetAcrsRequest(args, webview),
            getClustersRequest: (args) => this.handleGetClustersRequest(args, webview),

            // Federated identity credentials requests
            getPullRequestFederatedCredentialRequest: (args) =>
                this.handleGetPullRequestFederatedCredentialRequest(args.key, args.repositoryKey, webview),
            getBranchFederatedCredentialRequest: (args) =>
                this.handleGetBranchFederatedCredentialRequest(args.key, args.repositoryKey, args.branch, webview),
            createPullRequestFederatedCredentialRequest: (args) =>
                this.handleCreatePullRequestFederatedCredentialRequest(args.key, args.repositoryKey, webview),
            createBranchFederatedCredentialRequest: (args) =>
                this.handleCreateBranchFederatedCredentialRequest(args.key, args.repositoryKey, args.branch, webview),
            deletePullRequestFederatedCredentialRequest: (args) =>
                this.handleDeletePullRequestFederatedCredentialRequest(args.key, args.repositoryKey, webview),
            deleteBranchFederatedCredentialRequest: (args) =>
                this.handleDeleteBranchFederatedCredentialRequest(args.key, args.repositoryKey, args.branch, webview),

            // GitHub repo secrets requests
            getRepoSecretsRequest: (args) => this.handleGetRepoSecretsRequest(args, webview),
            updateRepoSecretRequest: (args) =>
                this.handleUpdateRepoSecretRequest(args.key, args.secret, args.value, webview),
            deleteRepoSecretRequest: (args) => this.handleDeleteRepoSecretRequest(args.key, args.secret, webview),

            // Azure resource role assignment requests
            getAcrRoleAssignmentsRequest: (args) =>
                this.handleGetAcrRoleAssignmentsRequest(args.acrKey, args.servicePrincipalKey, webview),
            getClusterRoleAssignmentsRequest: (args) =>
                this.handleGetClusterRoleAssignmentsRequest(args.clusterKey, args.servicePrincipalKey, webview),
            createAcrRoleAssignmentRequest: (args) =>
                this.handleCreateAcrRoleAssignmentRequest(
                    args.acrKey,
                    args.servicePrincipalKey,
                    args.roleDefinitionKey,
                    webview,
                ),
            createClusterRoleAssignmentRequest: (args) =>
                this.handleCreateClusterRoleAssignmentRequest(
                    args.clusterKey,
                    args.servicePrincipalKey,
                    args.roleDefinitionKey,
                    webview,
                ),
            deleteAcrRoleAssignmentRequest: (args) =>
                this.handleDeleteAcrRoleAssignmentRequest(
                    args.acrKey,
                    args.servicePrincipalKey,
                    args.roleDefinitionKey,
                    webview,
                ),
            deleteClusterRoleAssignmentRequest: (args) =>
                this.handleDeleteClusterRoleAssignmentRequest(
                    args.clusterKey,
                    args.servicePrincipalKey,
                    args.roleDefinitionKey,
                    webview,
                ),

            // Resource creation requests
            createEntraIdApplicationRequest: (args) =>
                this.handleCreateEntraIdApplicationRequest(args.applicationName, webview),
            deleteEntraIdApplicationRequest: (args) => this.handleDeleteEntraIdApplicationRequest(args, webview),
        };
    }

    private async handleGetBranchesRequest(repoKey: GitHubRepoKey, webview: MessageSink<ToWebViewMsgDef>) {
        const repo = this.gitHubRepos.find(
            (r) => r.gitHubRepoOwner === repoKey.gitHubRepoOwner && r.gitHubRepoName === repoKey.gitHubRepoName,
        );

        let branches: string[] = [];
        if (repo) {
            const sourceBranches = await this.octokit.repos.listBranches({
                owner: repoKey.gitHubRepoOwner,
                repo: repoKey.gitHubRepoName,
            });
            branches = sourceBranches.data.map((b) => b.name);
        } else {
            const error = `GitHub repository ${repoKey.gitHubRepoOwner}/${repoKey.gitHubRepoName} not found.`;
            window.showErrorMessage(error);
        }

        webview.postGetBranchesResponse({
            key: repoKey,
            branches,
        });
    }

    private async handleGetOwnedApplicationsRequest(webview: MessageSink<ToWebViewMsgDef>) {
        const sourceApplicationsResult = await getOwnedApplications(this.graphClient);
        const sourceApplications = defaultAndNotify(sourceApplicationsResult, []);

        const applications: EntraIdApplication[] = sourceApplications.map((a) => ({
            objectId: a.id,
            clientId: a.appId,
            applicationName: a.displayName,
        }));

        webview.postGetOwnedApplicationsResponse({ applications });
    }

    private async handleGetServicePrincipalsRequest(
        args: EntraIdApplicationKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const sourceServicePrincipalsResult = await getServicePrincipalsForApp(this.graphClient, args.clientId);
        const sourceServicePrincipals = defaultAndNotify(sourceServicePrincipalsResult, []);

        const servicePrincipals: ServicePrincipal[] = sourceServicePrincipals.map((s) => ({
            servicePrincipalId: s.id,
            servicePrincipalName: s.displayName,
        }));

        webview.postGetServicePrincipalsResponse({
            key: args,
            servicePrincipals,
        });
    }

    private async handleGetSubscriptionsRequest(webview: MessageSink<ToWebViewMsgDef>) {
        const azureSubscriptionsResult = await getSubscriptions(this.sessionProvider, SelectionType.AllIfNoFilters);
        const azureSubscriptions = defaultAndNotify(azureSubscriptionsResult, []);

        const subscriptions: Subscription[] = azureSubscriptions.map((subscription) => ({
            subscriptionId: subscription.subscriptionId,
            name: subscription.displayName,
        }));

        webview.postGetSubscriptionsResponse({ subscriptions });
    }

    private async handleGetAcrsRequest(key: SubscriptionKey, webview: MessageSink<ToWebViewMsgDef>) {
        const sourceAcrsResult = await getResources(
            this.sessionProvider,
            key.subscriptionId,
            "Microsoft.ContainerRegistry/registries",
        );
        const sourceAcrs = defaultAndNotify(sourceAcrsResult, []);

        const acrs: AcrKey[] = sourceAcrs
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((acr) => ({
                subscriptionId: key.subscriptionId,
                resourceGroup: acr.resourceGroup,
                acrName: acr.name,
            }));

        webview.postGetAcrsResponse({ key, acrs });
    }

    private async handleGetClustersRequest(key: SubscriptionKey, webview: MessageSink<ToWebViewMsgDef>) {
        const sourceClustersResult = await getResources(
            this.sessionProvider,
            key.subscriptionId,
            "Microsoft.ContainerService/managedClusters",
        );
        const sourceClusters = defaultAndNotify(sourceClustersResult, []);

        const clusters: ClusterKey[] = sourceClusters
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((acr) => ({
                subscriptionId: key.subscriptionId,
                resourceGroup: acr.resourceGroup,
                clusterName: acr.name,
            }));

        webview.postGetClustersResponse({ key, clusters });
    }

    private async handleGetPullRequestFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const federatedCredentialsResult = await getFederatedIdentityCredentials(this.graphClient, key.objectId);
        const federatedCredentials = defaultAndNotify(federatedCredentialsResult, []);

        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const pullRequestCredSubject = `repo:${repoIdentifier}:pull_request`;
        const pullRequestCred = findFederatedIdentityCredential(pullRequestCredSubject, federatedCredentials);

        webview.postGetPullRequestFederatedCredentialResponse({
            key,
            repositoryKey,
            hasCredential: pullRequestCred !== undefined,
        });
    }

    private async handleGetBranchFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        branch: string,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const federatedCredentialsResult = await getFederatedIdentityCredentials(this.graphClient, key.objectId);
        const federatedCredentials = defaultAndNotify(federatedCredentialsResult, []);

        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const branchCredSubject = `repo:${repoIdentifier}:ref:refs/heads/${branch}`;
        const branchCred = findFederatedIdentityCredential(branchCredSubject, federatedCredentials);

        webview.postGetBranchFederatedCredentialResponse({
            key,
            repositoryKey,
            branch,
            hasCredential: branchCred !== undefined,
        });
    }

    private async handleCreatePullRequestFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const pullRequestCredSubject = `repo:${repoIdentifier}:pull_request`;
        const createdCred = await createFederatedIdentityCredential(
            this.graphClient,
            key.objectId,
            pullRequestCredSubject,
            `${repoIdentifier.replace("/", "-")}-pr`,
            `Identity representing pull requests on ${repoIdentifier}`,
        );

        if (failed(createdCred)) {
            window.showErrorMessage(createdCred.error);
        }

        webview.postCreatePullRequestFederatedCredentialResponse({
            key,
            repositoryKey,
            hasCredential: succeeded(createdCred),
        });
    }

    private async handleCreateBranchFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        branch: string,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const branchCredSubject = `repo:${repoIdentifier}:ref:refs/heads/${branch}`;
        const createdCred = await createFederatedIdentityCredential(
            this.graphClient,
            key.objectId,
            branchCredSubject,
            `${repoIdentifier.replace("/", "-")}-${branch}`,
            `Identity representing the ${branch} branch on ${repoIdentifier}`,
        );

        if (failed(createdCred)) {
            window.showErrorMessage(createdCred.error);
        }

        webview.postCreateBranchFederatedCredentialResponse({
            key,
            repositoryKey,
            branch,
            hasCredential: succeeded(createdCred),
        });
    }

    private async handleDeletePullRequestFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const federatedCredentialsResult = await getFederatedIdentityCredentials(this.graphClient, key.objectId);
        const federatedCredentials = defaultAndNotify(federatedCredentialsResult, []);

        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const pullRequestCredSubject = `repo:${repoIdentifier}:pull_request`;
        const pullRequestCred = findFederatedIdentityCredential(pullRequestCredSubject, federatedCredentials);
        let hasCredential = false;
        if (pullRequestCred) {
            const result = await deleteFederatedIdentityCredential(this.graphClient, key.objectId, pullRequestCred.id);
            if (failed(result)) {
                window.showErrorMessage(result.error);
                hasCredential = true;
            }
        }

        webview.postDeletePullRequestFederatedCredentialResponse({
            key,
            repositoryKey,
            hasCredential,
        });
    }

    private async handleDeleteBranchFederatedCredentialRequest(
        key: EntraIdApplicationKey,
        repositoryKey: GitHubRepoKey,
        branch: string,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const repoIdentifier = `${repositoryKey.gitHubRepoOwner}/${repositoryKey.gitHubRepoName}`;
        const branchCredSubject = `repo:${repoIdentifier}:ref:refs/heads/${branch}`;
        const federatedCredentialsResult = await getFederatedIdentityCredentials(this.graphClient, key.objectId);
        const federatedCredentials = defaultAndNotify(federatedCredentialsResult, []);

        const branchCred = findFederatedIdentityCredential(branchCredSubject, federatedCredentials);
        let hasCredential = false;
        if (branchCred) {
            const result = await deleteFederatedIdentityCredential(this.graphClient, key.objectId, branchCred.id);
            if (failed(result)) {
                window.showErrorMessage(result.error);
                hasCredential = true;
            }
        }

        webview.postDeleteBranchFederatedCredentialResponse({
            key,
            repositoryKey,
            branch,
            hasCredential,
        });
    }

    private async handleGetRepoSecretsRequest(key: GitHubRepoKey, webview: MessageSink<ToWebViewMsgDef>) {
        const secretStateResult = await getRepoSecretState(this.octokit, key);
        const secretState = defaultAndNotify(secretStateResult, defaultSecretState);

        webview.postGetRepoSecretsResponse({ key, secretState });
    }

    private async handleUpdateRepoSecretRequest(
        key: GitHubRepoKey,
        secret: GitHubRepoSecret,
        value: string,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const publicKey = await getRepoPublicKey(this.octokit, key.gitHubRepoOwner, key.gitHubRepoName);
        if (failed(publicKey)) {
            window.showErrorMessage(publicKey.error);
            const secretStateResult = await getRepoSecretState(this.octokit, key);
            const secretState = defaultAndNotify(secretStateResult, defaultSecretState);
            webview.postUpdateRepoSecretResponse({
                key,
                secret,
                secretState,
            });
            return;
        }

        const secretUrlResult = await createGitHubSecret(
            this.octokit,
            key.gitHubRepoOwner,
            key.gitHubRepoName,
            publicKey.result,
            secret,
            value,
        );
        if (failed(secretUrlResult)) {
            window.showErrorMessage(secretUrlResult.error);
        }

        const secretStateResult = await getRepoSecretState(this.octokit, key);
        const secretState = defaultAndNotify(secretStateResult, defaultSecretState);
        webview.postUpdateRepoSecretResponse({
            key,
            secret,
            secretState,
        });
    }

    private async handleDeleteRepoSecretRequest(
        key: GitHubRepoKey,
        secret: GitHubRepoSecret,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const result = await deleteGitHubSecret(this.octokit, key.gitHubRepoOwner, key.gitHubRepoName, secret);
        if (failed(result)) {
            window.showErrorMessage(result.error);
        }

        const secretStateResult = await getRepoSecretState(this.octokit, key);
        const secretState = defaultAndNotify(secretStateResult, defaultSecretState);
        webview.postDeleteRepoSecretResponse({
            key,
            secret,
            secretState,
        });
    }

    private async handleGetAcrRoleAssignmentsRequest(
        acrKey: AcrKey,
        servicePrincipalKey: ServicePrincipalKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, acrKey.subscriptionId);
        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForAcr(
            client,
            servicePrincipalKey.servicePrincipalId,
            acrKey.resourceGroup,
            acrKey.acrName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asAcrRoleDefinition));
        webview.postGetAcrRoleAssignmentsResponse({
            acrKey,
            servicePrincipalKey,
            assignedRoleDefinitions,
        });
    }

    private async handleGetClusterRoleAssignmentsRequest(
        clusterKey: ClusterKey,
        servicePrincipalKey: ServicePrincipalKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, clusterKey.subscriptionId);
        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForCluster(
            client,
            servicePrincipalKey.servicePrincipalId,
            clusterKey.resourceGroup,
            clusterKey.clusterName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asClusterRoleDefinition));
        webview.postGetClusterRoleAssignmentsResponse({
            clusterKey,
            servicePrincipalKey,
            assignedRoleDefinitions,
        });
    }

    private async handleCreateAcrRoleAssignmentRequest(
        acrKey: AcrKey,
        servicePrincipalKey: ServicePrincipalKey,
        roleDefinitionKey: AcrRoleDefinitionKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, acrKey.subscriptionId);

        const scope = getScopeForAcr(acrKey.subscriptionId, acrKey.resourceGroup, acrKey.acrName);

        const roleAssignment = await createRoleAssignment(
            client,
            acrKey.subscriptionId,
            servicePrincipalKey.servicePrincipalId,
            roleDefinitionKey.roleDefinitionName,
            "ServicePrincipal",
            scope,
        );

        if (failed(roleAssignment)) {
            window.showErrorMessage(roleAssignment.error);
        }

        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForAcr(
            client,
            servicePrincipalKey.servicePrincipalId,
            acrKey.resourceGroup,
            acrKey.acrName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asAcrRoleDefinition));
        webview.postCreateAcrRoleAssignmentResponse({
            acrKey,
            servicePrincipalKey,
            roleDefinitionKey,
            assignedRoleDefinitions,
        });
    }

    private async handleCreateClusterRoleAssignmentRequest(
        clusterKey: ClusterKey,
        servicePrincipalKey: ServicePrincipalKey,
        roleDefinitionKey: ClusterRoleDefinitionKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, clusterKey.subscriptionId);
        const scope = getScopeForCluster(clusterKey.subscriptionId, clusterKey.resourceGroup, clusterKey.clusterName);
        const roleAssignment = await createRoleAssignment(
            client,
            clusterKey.subscriptionId,
            servicePrincipalKey.servicePrincipalId,
            roleDefinitionKey.roleDefinitionName,
            "ServicePrincipal",
            scope,
        );

        if (failed(roleAssignment)) {
            window.showErrorMessage(roleAssignment.error);
        }

        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForCluster(
            client,
            servicePrincipalKey.servicePrincipalId,
            clusterKey.resourceGroup,
            clusterKey.clusterName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asClusterRoleDefinition));
        webview.postCreateClusterRoleAssignmentResponse({
            clusterKey,
            servicePrincipalKey,
            roleDefinitionKey,
            assignedRoleDefinitions,
        });
    }

    private async handleDeleteAcrRoleAssignmentRequest(
        acrKey: AcrKey,
        servicePrincipalKey: ServicePrincipalKey,
        roleDefinitionKey: AcrRoleDefinitionKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, acrKey.subscriptionId);
        const scope = getScopeForAcr(acrKey.subscriptionId, acrKey.resourceGroup, acrKey.acrName);
        await deleteRoleAssignment(
            client,
            acrKey.subscriptionId,
            servicePrincipalKey.servicePrincipalId,
            roleDefinitionKey.roleDefinitionName,
            scope,
        );

        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForAcr(
            client,
            servicePrincipalKey.servicePrincipalId,
            acrKey.resourceGroup,
            acrKey.acrName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asAcrRoleDefinition));
        webview.postDeleteAcrRoleAssignmentResponse({
            acrKey,
            servicePrincipalKey,
            roleDefinitionKey,
            assignedRoleDefinitions,
        });
    }

    private async handleDeleteClusterRoleAssignmentRequest(
        clusterKey: ClusterKey,
        servicePrincipalKey: ServicePrincipalKey,
        roleDefinitionKey: ClusterRoleDefinitionKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const client = getAuthorizationManagementClient(this.sessionProvider, clusterKey.subscriptionId);
        const scope = getScopeForCluster(clusterKey.subscriptionId, clusterKey.resourceGroup, clusterKey.clusterName);
        await deleteRoleAssignment(
            client,
            clusterKey.subscriptionId,
            servicePrincipalKey.servicePrincipalId,
            roleDefinitionKey.roleDefinitionName,
            scope,
        );

        const roleAssignmentsResult = await getPrincipalRoleAssignmentsForCluster(
            client,
            servicePrincipalKey.servicePrincipalId,
            clusterKey.resourceGroup,
            clusterKey.clusterName,
        );

        const roleAssignments = defaultAndNotify(roleAssignmentsResult, []);
        const assignedRoleDefinitions = filterNulls(roleAssignments.map(asClusterRoleDefinition));
        webview.postDeleteClusterRoleAssignmentResponse({
            clusterKey,
            servicePrincipalKey,
            roleDefinitionKey,
            assignedRoleDefinitions,
        });
    }

    private async handleCreateEntraIdApplicationRequest(
        applicationName: string,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        const currentUserId = await getCurrentUserId(this.graphClient);
        if (failed(currentUserId)) {
            window.showErrorMessage(currentUserId.error);
            return;
        }

        const application = await createApplication(this.graphClient, applicationName, currentUserId.result);
        if (failed(application)) {
            window.showErrorMessage(application.error);
            return;
        }

        const servicePrincipal = await createServicePrincipal(this.graphClient, application.result.appId);
        if (failed(servicePrincipal)) {
            window.showErrorMessage(servicePrincipal.error);
            return;
        }

        const sourceApplications = await getOwnedApplications(this.graphClient);
        if (failed(sourceApplications)) {
            window.showErrorMessage(sourceApplications.error);
            return;
        }

        const applications: EntraIdApplication[] = sourceApplications.result.map((a) => ({
            objectId: a.id,
            clientId: a.appId,
            applicationName: a.displayName,
        }));

        const newApplication = {
            objectId: application.result.id,
            clientId: application.result.appId,
            applicationName: application.result.displayName,
        };

        const newServicePrincipal = {
            servicePrincipalId: servicePrincipal.result.id,
            servicePrincipalName: servicePrincipal.result.displayName,
        };

        webview.postCreateEntraIdApplicationResponse({
            applications,
            newApplicationName: applicationName,
            newApplication,
            newServicePrincipal,
        });
    }

    private async handleDeleteEntraIdApplicationRequest(
        args: EntraIdApplicationKey,
        webview: MessageSink<ToWebViewMsgDef>,
    ) {
        await deleteApplication(this.graphClient, args.objectId);

        const sourceApplicationsResult = await getOwnedApplications(this.graphClient);
        const sourceApplications = defaultAndNotify(sourceApplicationsResult, []);

        const applications: EntraIdApplication[] = sourceApplications.map((a) => ({
            objectId: a.id,
            clientId: a.appId,
            applicationName: a.displayName,
        }));

        webview.postDeleteEntraIdApplicationResponse({ applications });
    }
}

async function getRepoSecretState(octokit: Octokit, key: GitHubRepoKey): Promise<Errorable<GitHubRepoSecretState>> {
    try {
        // TODO: pagination
        const secrets = await octokit.actions.listRepoSecrets({
            owner: key.gitHubRepoOwner,
            repo: key.gitHubRepoName,
        });

        const result: GitHubRepoSecretState = {
            AZURE_CLIENT_ID: secrets.data.secrets.find((s) => s.name === "AZURE_CLIENT_ID") !== undefined,
            AZURE_TENANT_ID: secrets.data.secrets.find((s) => s.name === "AZURE_TENANT_ID") !== undefined,
            AZURE_SUBSCRIPTION_ID: secrets.data.secrets.find((s) => s.name === "AZURE_SUBSCRIPTION_ID") !== undefined,
        };

        return { succeeded: true, result };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

function asAcrRoleDefinition(roleAssignment: RoleAssignment): AcrRoleDefinition | null {
    if (!roleAssignment.roleDefinitionId) {
        return null;
    }

    const roleDefinitionName = roleAssignment.roleDefinitionId.split("/").pop() || "";
    const knownRoleDefinitionNames: AcrRoleDefinitionName[] = [
        acrPushRoleDefinitionName,
        contributorRoleDefinitionName,
    ];
    const matchingDefinitionName = knownRoleDefinitionNames.find((n) => roleDefinitionName.includes(n));
    if (!matchingDefinitionName) {
        return null;
    }

    return {
        ...acrRoleLookup[matchingDefinitionName],
        roleDefinitionId: roleAssignment.roleDefinitionId,
    };
}

function asClusterRoleDefinition(roleAssignment: RoleAssignment): ClusterRoleDefinition | null {
    if (!roleAssignment.roleDefinitionId) {
        return null;
    }

    const roleDefinitionName = roleAssignment.roleDefinitionId.split("/").pop() || "";
    const knownRoleDefinitionNames: ClusterRoleDefinitionName[] = [
        aksClusterUserRoleDefinitionName,
        contributorRoleDefinitionName,
    ];
    const matchingDefinitionName = knownRoleDefinitionNames.find((n) => roleDefinitionName.includes(n));
    if (!matchingDefinitionName) {
        return null;
    }

    return {
        ...clusterRoleLookup[matchingDefinitionName],
        roleDefinitionId: roleAssignment.roleDefinitionId,
    };
}

function defaultAndNotify<T>(value: Errorable<T>, defaultValue: T): T {
    if (failed(value)) {
        window.showErrorMessage(value.error);
        return defaultValue;
    }
    return value.result;
}

function filterNulls<T>(values: (T | null)[]): T[] {
    return values.filter((v) => v !== null) as T[];
}
