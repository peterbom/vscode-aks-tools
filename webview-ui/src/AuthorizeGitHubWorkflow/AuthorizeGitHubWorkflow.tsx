import { useEffect, useState } from "react";
import {
    Acr,
    AcrRoleDefinition,
    Cluster,
    ClusterRoleDefinition,
    EntraIdApplication,
    GitHubRepo,
    GitHubRepoSecret,
    InitialState,
    ServicePrincipal,
    Subscription,
    aksClusterUserRoleDefinitionName,
    contributorRoleDefinitionName,
} from "../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { Lazy, isLoaded, map as lazyMap } from "../utilities/lazy";
import { useStateManagement } from "../utilities/state";
import styles from "./AuthorizeGitHubWorkflow.module.css";
import {
    EventHandlerFunc,
    ensureAcrRoleAssignmentsLoaded,
    ensureAcrsLoaded,
    ensureBranchFederatedCredentialLoaded,
    ensureClusterRoleAssignmentsLoaded,
    ensureClustersLoaded,
    ensureGitHubRepoBranchNamesLoaded,
    ensureGitHubRepoSecretStateLoaded,
    ensureOwnedApplicationsLoaded,
    ensurePullRequestFederatedCredentialLoaded,
    ensureServicePrincipalsLoaded,
    ensureSubscriptionsLoaded,
} from "./state/dataLoading";
import { AuthorizeGitHubWorkflowState, stateUpdater, vscode } from "./state/state";
import { distinct } from "../utilities/array";
import { ResourceSelector } from "../components/ResourceSelector";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import { NewApplicationDialog } from "./dialogs/NewApplicationDialog";
import { DeleteApplicationDialog } from "./dialogs/DeleteApplicationDialog";
import { InlineAction, InlineActionProps, makeFixAction, makeInlineActionProps } from "../components/InlineAction";

export function AuthorizeGitHubWorkflow(initialState: InitialState) {
    const { state, eventHandlers } = useStateManagement(stateUpdater, initialState, vscode);

    const updates: EventHandlerFunc[] = [];
    const {
        lazyBranchNames,
        lazyHasClientIdSecret,
        lazyHasTenantIdSecret,
        lazyHasSubscriptionIdSecret,
        lazyOwnedApplications,
        lazyServicePrincipals,
        lazyHasPullRequestFederatedCredential,
        lazyHasBranchFederatedCredential,
        lazySubscriptions,
        lazyAcrResourceGroups,
        lazyClusterResourceGroups,
        lazyAcrs,
        lazyClusters,
        lazyAcrAssignedRoles,
        lazyClusterAssignedRoles,
    } = prepareData(state, updates);
    useEffect(() => {
        updates.map((fn) => fn(eventHandlers));
    });

    const [isNewApplicationDialogVisible, setIsNewApplicationDialogVisible] = useState(false);
    const [isDeleteApplicationDialogVisible, setIsDeleteApplicationDialogVisible] = useState(false);

    function getTenantIdSecretActionItemProps(): InlineActionProps {
        const setAction = makeFixAction(faSave, "Save", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("AZURE_TENANT_ID", setAction, deleteAction);

        if (state.selectedRepository === null) {
            actionItemProps.extraInfo = "Please select a GitHub repository.";
            return actionItemProps;
        }

        if (!isLoaded(lazyHasTenantIdSecret)) {
            actionItemProps.extraInfo = "Loading secret state...";
            return actionItemProps;
        }

        const repo = state.selectedRepository;

        actionItemProps.isDone = lazyHasTenantIdSecret.value;
        setAction.canPerformAction = true;
        setAction.action = () => handleSetGitHubRepoSecret(repo, "AZURE_TENANT_ID", state.azureReferenceData.tenantId);
        deleteAction.canPerformAction = lazyHasTenantIdSecret.value;
        deleteAction.action = () => handleDeleteGitHubRepoSecret(repo, "AZURE_TENANT_ID");

        return actionItemProps;
    }

    function getClientIdSecretActionItemProps(): InlineActionProps {
        const setAction = makeFixAction(faSave, "Save", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("AZURE_CLIENT_ID", setAction, deleteAction);

        if (state.selectedRepository === null) {
            actionItemProps.extraInfo = "Please select a GitHub repository.";
            return actionItemProps;
        }

        if (state.selectedApplication === null) {
            actionItemProps.extraInfo = "Please select an application.";
            return actionItemProps;
        }

        if (!isLoaded(lazyHasClientIdSecret)) {
            actionItemProps.extraInfo = "Loading secret state...";
            return actionItemProps;
        }

        const repo = state.selectedRepository;
        const clientId = state.selectedApplication.clientId;

        actionItemProps.isDone = lazyHasClientIdSecret.value;
        setAction.canPerformAction = true;
        setAction.action = () => handleSetGitHubRepoSecret(repo, "AZURE_CLIENT_ID", clientId);
        deleteAction.canPerformAction = lazyHasClientIdSecret.value;
        deleteAction.action = () => handleDeleteGitHubRepoSecret(repo, "AZURE_CLIENT_ID");

        return actionItemProps;
    }

    function getSubscriptionIdSecretActionItemProps(): InlineActionProps {
        const setAction = makeFixAction(faSave, "Save", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("AZURE_SUBSCRIPTION_ID", setAction, deleteAction);

        if (state.selectedRepository === null) {
            actionItemProps.extraInfo = "Please select a GitHub repository.";
            return actionItemProps;
        }

        if (state.selectedSubscription === null) {
            actionItemProps.extraInfo = "Please select a subscription.";
            return actionItemProps;
        }

        if (!isLoaded(lazyHasSubscriptionIdSecret)) {
            actionItemProps.extraInfo = "Loading secret state...";
            return actionItemProps;
        }

        const repo = state.selectedRepository;
        const subscriptionId = state.selectedSubscription.subscriptionId;

        actionItemProps.isDone = lazyHasSubscriptionIdSecret.value;
        setAction.canPerformAction = true;
        setAction.action = () => handleSetGitHubRepoSecret(repo, "AZURE_SUBSCRIPTION_ID", subscriptionId);
        deleteAction.canPerformAction = lazyHasSubscriptionIdSecret.value;
        deleteAction.action = () => handleDeleteGitHubRepoSecret(repo, "AZURE_SUBSCRIPTION_ID");

        return actionItemProps;
    }

    function getPullRequestCredentialActionItemProps(): InlineActionProps {
        const createAction = makeFixAction(faSave, "Create", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("Pull Requests Credential", createAction, deleteAction);

        if (state.selectedRepository === null) {
            actionItemProps.extraInfo = "Please select a GitHub repository.";
            return actionItemProps;
        }

        if (state.selectedApplication === null) {
            actionItemProps.extraInfo = "Please select an application.";
            return actionItemProps;
        }

        if (!isLoaded(lazyHasPullRequestFederatedCredential)) {
            actionItemProps.extraInfo = "Loading federated credentials...";
            return actionItemProps;
        }

        const repo = state.selectedRepository;
        const application = state.selectedApplication;
        const isDone = lazyHasPullRequestFederatedCredential.value;

        actionItemProps.isDone = isDone;
        createAction.canPerformAction = !isDone;
        createAction.action = () => handleCreatePullRequestFederatedCredential(application, repo);
        deleteAction.canPerformAction = isDone;
        deleteAction.action = () => handleDeletePullRequestFederatedCredential(application, repo);

        return actionItemProps;
    }

    function getBranchCredentialActionItemProps(): InlineActionProps {
        const createAction = makeFixAction(faSave, "Create", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("Branch Credential", createAction, deleteAction);

        if (state.selectedRepository === null) {
            actionItemProps.extraInfo = "Please select a GitHub repository.";
            return actionItemProps;
        }

        if (state.selectedBranch === null) {
            actionItemProps.extraInfo = "Please select a branch.";
            return actionItemProps;
        }

        if (state.selectedApplication === null) {
            actionItemProps.extraInfo = "Please select an application.";
            return actionItemProps;
        }

        if (!isLoaded(lazyHasBranchFederatedCredential)) {
            actionItemProps.extraInfo = "Loading federated credentials...";
            return actionItemProps;
        }

        const repo = state.selectedRepository;
        const branch = state.selectedBranch;
        const application = state.selectedApplication;
        const isDone = lazyHasBranchFederatedCredential.value;

        actionItemProps.isDone = isDone;
        createAction.canPerformAction = !isDone;
        createAction.action = () => handleCreateBranchFederatedCredential(application, repo, branch);
        deleteAction.canPerformAction = isDone;
        deleteAction.action = () => handleDeleteBranchFederatedCredential(application, repo, branch);

        return actionItemProps;
    }

    function getAcrAuthorizationActionItemProps(): InlineActionProps {
        const createAction = makeFixAction(faSave, "Save", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("ACR", createAction, deleteAction);

        if (state.selectedAcr === null) {
            actionItemProps.extraInfo = "Please select an ACR.";
            return actionItemProps;
        }

        if (state.selectedServicePrincipal === null) {
            actionItemProps.extraInfo = "Please select a service principal.";
            return actionItemProps;
        }

        if (!isLoaded(lazyAcrAssignedRoles)) {
            actionItemProps.extraInfo = "Loading ACR role assignments...";
            return actionItemProps;
        }

        const assignedRoles = lazyAcrAssignedRoles.value;
        const acr = state.selectedAcr;
        const servicePrincipal = state.selectedServicePrincipal;
        const isDone = assignedRoles.some((r) => r.roleDefinitionName === contributorRoleDefinitionName);

        actionItemProps.isDone = isDone;
        createAction.canPerformAction = !isDone;
        createAction.action = () => handleCreateAcrRoleAssignment(acr, servicePrincipal);
        deleteAction.canPerformAction = isDone;
        deleteAction.action = () => handleDeleteAcrRoleAssignment(acr, servicePrincipal);

        return actionItemProps;
    }

    function getClusterAuthorizationActionItemProps(): InlineActionProps {
        const createAction = makeFixAction(faSave, "Save", null, false);
        const deleteAction = makeFixAction(faTrash, "Delete", null, false);
        const actionItemProps = makeInlineActionProps("Cluster", createAction, deleteAction);

        if (state.selectedCluster === null) {
            actionItemProps.extraInfo = "Please select a cluster.";
            return actionItemProps;
        }

        if (state.selectedServicePrincipal === null) {
            actionItemProps.extraInfo = "Please select a service principal.";
            return actionItemProps;
        }

        if (!isLoaded(lazyClusterAssignedRoles)) {
            actionItemProps.extraInfo = "Loading cluster role assignments...";
            return actionItemProps;
        }

        const assignedRoles = lazyClusterAssignedRoles.value;
        const cluster = state.selectedCluster;
        const servicePrincipal = state.selectedServicePrincipal;
        const isDone = assignedRoles.some((r) => r.roleDefinitionName === aksClusterUserRoleDefinitionName);

        actionItemProps.isDone = isDone;
        createAction.canPerformAction = !isDone;
        createAction.action = () => handleCreateClusterRoleAssignment(cluster, servicePrincipal);
        deleteAction.canPerformAction = isDone;
        deleteAction.action = () => handleDeleteClusterRoleAssignment(cluster, servicePrincipal);

        return actionItemProps;
    }

    function handleSetGitHubRepoSecret(repo: GitHubRepo, secret: GitHubRepoSecret, value: string) {
        eventHandlers.onSetSecretLoading({ key: repo, secret });
        vscode.postUpdateRepoSecretRequest({ key: repo, secret, value });
    }

    function handleDeleteGitHubRepoSecret(repo: GitHubRepo, secret: GitHubRepoSecret) {
        eventHandlers.onSetSecretLoading({ key: repo, secret });
        vscode.postDeleteRepoSecretRequest({ key: repo, secret });
    }

    function handleCreatePullRequestFederatedCredential(application: EntraIdApplication, repo: GitHubRepo) {
        eventHandlers.onSetPullRequestFederatedCredentialLoading({ key: application, repositoryKey: repo });
        vscode.postCreatePullRequestFederatedCredentialRequest({ key: application, repositoryKey: repo });
    }

    function handleDeletePullRequestFederatedCredential(application: EntraIdApplication, repo: GitHubRepo) {
        eventHandlers.onSetPullRequestFederatedCredentialLoading({ key: application, repositoryKey: repo });
        vscode.postDeletePullRequestFederatedCredentialRequest({ key: application, repositoryKey: repo });
    }

    function handleCreateBranchFederatedCredential(application: EntraIdApplication, repo: GitHubRepo, branch: string) {
        eventHandlers.onSetBranchFederatedCredentialLoading({ key: application, repositoryKey: repo, branch });
        vscode.postCreateBranchFederatedCredentialRequest({ key: application, repositoryKey: repo, branch });
    }

    function handleDeleteBranchFederatedCredential(application: EntraIdApplication, repo: GitHubRepo, branch: string) {
        eventHandlers.onSetBranchFederatedCredentialLoading({ key: application, repositoryKey: repo, branch });
        vscode.postDeleteBranchFederatedCredentialRequest({ key: application, repositoryKey: repo, branch });
    }

    function handleCreateAcrRoleAssignment(acr: Acr, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetAcrRoleAssignmentsLoading({ acrKey: acr, servicePrincipalKey: servicePrincipal });
        vscode.postCreateAcrRoleAssignmentRequest({
            acrKey: acr,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: contributorRoleDefinitionName },
        });
    }

    function handleDeleteAcrRoleAssignment(acr: Acr, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetAcrRoleAssignmentsLoading({ acrKey: acr, servicePrincipalKey: servicePrincipal });
        vscode.postDeleteAcrRoleAssignmentRequest({
            acrKey: acr,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: contributorRoleDefinitionName },
        });
    }

    function handleCreateClusterRoleAssignment(cluster: Cluster, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetClusterRoleAssignmentsLoading({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
        });
        vscode.postCreateClusterRoleAssignmentRequest({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: aksClusterUserRoleDefinitionName },
        });
    }

    function handleDeleteClusterRoleAssignment(cluster: Cluster, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetClusterRoleAssignmentsLoading({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
        });
        vscode.postDeleteClusterRoleAssignmentRequest({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: aksClusterUserRoleDefinitionName },
        });
    }

    function handleCreateNewApplication(applicationName: string) {
        setIsNewApplicationDialogVisible(false);
        eventHandlers.onSetOwnedApplicationsLoading();
        vscode.postCreateEntraIdApplicationRequest({ applicationName });
    }

    function handleDeleteSelectedApplication() {
        if (!state.selectedApplication) {
            return;
        }

        setIsDeleteApplicationDialogVisible(false);
        eventHandlers.onSetOwnedApplicationsLoading();
        vscode.postDeleteEntraIdApplicationRequest(state.selectedApplication);
    }

    const canSelectServicePrincipal =
        isLoaded(lazyServicePrincipals) &&
        (lazyServicePrincipals.value.length !== 1 || state.selectedServicePrincipal === null);

    return (
        <>
            <h2>Authorize GitHub Workflow</h2>
            <fieldset className={styles.inputContainer}>
                <h3 className={styles.fullWidth}>GitHub</h3>
                <p className={styles.fullWidth}>
                    Select the GitHub repository containing the workflow you want to authorize, and the branch you want
                    to run it on. The workflow will require some secrets to be set in the repository.
                </p>

                <label htmlFor="repo-input" className={styles.label}>
                    GitHub Repository
                </label>
                <ResourceSelector<GitHubRepo>
                    id="repo-input"
                    className={styles.control}
                    resources={state.gitHubReferenceData.repositories.map((r) => r.repository)}
                    selectedItem={state.selectedRepository}
                    valueGetter={(r) => r.url}
                    labelGetter={(r) => `${r.gitHubRepoOwner}/${r.gitHubRepoName} (${r.forkName})`}
                    onSelect={eventHandlers.onSetSelectedRepository}
                />

                <label htmlFor="branch-input" className={styles.label}>
                    Branch
                </label>
                <ResourceSelector<string>
                    id="branch-input"
                    className={styles.control}
                    resources={lazyBranchNames}
                    selectedItem={state.selectedBranch}
                    valueGetter={(b) => b}
                    labelGetter={(b) => b}
                    onSelect={eventHandlers.onSetSelectedBranch}
                />

                <label className={styles.label}>Repository Secrets</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <InlineAction {...getTenantIdSecretActionItemProps()} />
                    <InlineAction {...getClientIdSecretActionItemProps()} />
                    <InlineAction {...getSubscriptionIdSecretActionItemProps()} />
                </div>

                <h3 className={styles.fullWidth}>Entra ID</h3>
                <p className={styles.fullWidth}>
                    Select or create an Entra ID application. This application&apos;s identity will be used by the
                    workflow to access the Azure Container Registry (ACR) and AKS cluster. This requires{" "}
                    <VSCodeLink href="https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation">
                        federated identity credentials
                    </VSCodeLink>{" "}
                    to be configured for the application.
                </p>

                <label htmlFor="application-input" className={styles.label}>
                    Entra ID Application
                </label>
                <div className={`${styles.control} ${styles.withButtonContainer}`}>
                    <ResourceSelector<EntraIdApplication>
                        id="application-input"
                        resources={lazyOwnedApplications}
                        selectedItem={state.selectedApplication}
                        valueGetter={(a) => a.objectId}
                        labelGetter={(a) => a.applicationName}
                        onSelect={eventHandlers.onSetSelectedApplication}
                    />
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => setIsDeleteApplicationDialogVisible(true)}
                        disabled={!isLoaded(lazyOwnedApplications) || !state.selectedApplication}
                        title="Delete application"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </VSCodeButton>
                </div>

                {isLoaded(lazyOwnedApplications) && (
                    <div className={styles.controlSupplement}>
                        <VSCodeButton appearance="icon" onClick={() => setIsNewApplicationDialogVisible(true)}>
                            <span className={styles.iconButton}>
                                <FontAwesomeIcon icon={faPlus} /> Create new
                            </span>
                        </VSCodeButton>
                    </div>
                )}

                {canSelectServicePrincipal && (
                    <>
                        <label htmlFor="service-principal-input" className={styles.label}>
                            Service Principal
                        </label>
                        <ResourceSelector<ServicePrincipal>
                            id="service-principal-input"
                            className={styles.control}
                            resources={lazyServicePrincipals}
                            selectedItem={state.selectedServicePrincipal}
                            valueGetter={(sp) => sp.servicePrincipalId}
                            labelGetter={(sp) => sp.servicePrincipalName}
                            onSelect={eventHandlers.onSetSelectedServicePrincipal}
                        />
                    </>
                )}

                <label className={styles.label}>Federated Identity Credentials</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <InlineAction {...getPullRequestCredentialActionItemProps()} />
                    <InlineAction {...getBranchCredentialActionItemProps()} />
                </div>

                <h3 className={styles.fullWidth}>Azure Resources</h3>
                <p className={styles.fullWidth}>
                    Select the Azure Container Registry (ACR) and AKS cluster that the workflow will interact with. The
                    application you selected will need to be authorized to access these resources.
                </p>
                <p className={styles.fullWidth}>
                    This requires assigning the service principal the{" "}
                    <VSCodeLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#contributor">
                        Contributor
                    </VSCodeLink>{" "}
                    role to the ACR and the{" "}
                    <VSCodeLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers#azure-kubernetes-service-cluster-user-role">
                        Azure Kubernetes Service Cluster User Role
                    </VSCodeLink>{" "}
                    role to the AKS cluster.
                </p>

                <label htmlFor="subscription-input" className={styles.label}>
                    Subscription
                </label>
                <ResourceSelector<Subscription>
                    id="subscription-input"
                    className={styles.control}
                    resources={lazySubscriptions}
                    selectedItem={state.selectedSubscription}
                    valueGetter={(s) => s.subscriptionId}
                    labelGetter={(s) => s.name}
                    onSelect={eventHandlers.onSetSelectedSubscription}
                />

                <label htmlFor="acr-rg-input" className={styles.label}>
                    ACR Resource Group
                </label>
                <ResourceSelector<string>
                    id="acr-rg-input"
                    className={styles.control}
                    resources={lazyAcrResourceGroups}
                    selectedItem={state.selectedAcrResourceGroup}
                    valueGetter={(g) => g}
                    labelGetter={(g) => g}
                    onSelect={eventHandlers.onSetSelectedAcrResourceGroup}
                />

                <label htmlFor="acr-input" className={styles.label}>
                    Container Registry
                </label>
                <ResourceSelector<Acr>
                    id="acr-input"
                    className={styles.control}
                    resources={lazyAcrs}
                    selectedItem={state.selectedAcr}
                    valueGetter={(acr) => acr.acrName}
                    labelGetter={(acr) => acr.acrName}
                    onSelect={eventHandlers.onSetSelectedAcr}
                />

                <label htmlFor="cluster-rg-input" className={styles.label}>
                    Cluster Resource Group
                </label>
                <ResourceSelector<string>
                    id="cluster-rg-input"
                    className={styles.control}
                    resources={lazyClusterResourceGroups}
                    selectedItem={state.selectedClusterResourceGroup}
                    valueGetter={(g) => g}
                    labelGetter={(g) => g}
                    onSelect={eventHandlers.onSetSelectedClusterResourceGroup}
                />

                <label htmlFor="cluster-input" className={styles.label}>
                    Cluster
                </label>
                <ResourceSelector<Cluster>
                    id="cluster-input"
                    className={styles.control}
                    resources={lazyClusters}
                    selectedItem={state.selectedCluster}
                    valueGetter={(c) => c.clusterName}
                    labelGetter={(c) => c.clusterName}
                    onSelect={eventHandlers.onSetSelectedCluster}
                />

                <label className={styles.label}>Role Assignments</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <InlineAction {...getAcrAuthorizationActionItemProps()} />
                    <InlineAction {...getClusterAuthorizationActionItemProps()} />
                </div>
            </fieldset>

            {isLoaded(lazyOwnedApplications) && (
                <NewApplicationDialog
                    shown={isNewApplicationDialogVisible}
                    existingApplicationNames={lazyOwnedApplications.value.map((a) => a.applicationName)}
                    onHidden={() => setIsNewApplicationDialogVisible(false)}
                    onCreate={(name) => handleCreateNewApplication(name)}
                />
            )}

            {state.selectedApplication && (
                <DeleteApplicationDialog
                    shown={isDeleteApplicationDialogVisible}
                    applicationName={state.selectedApplication.applicationName}
                    onHidden={() => setIsDeleteApplicationDialogVisible(false)}
                    onDelete={() => handleDeleteSelectedApplication()}
                />
            )}
        </>
    );
}

type LocalData = {
    lazyBranchNames: Lazy<string[]>;
    lazyHasClientIdSecret: Lazy<boolean>;
    lazyHasTenantIdSecret: Lazy<boolean>;
    lazyHasSubscriptionIdSecret: Lazy<boolean>;
    lazyOwnedApplications: Lazy<EntraIdApplication[]>;
    lazyServicePrincipals: Lazy<ServicePrincipal[]>;
    lazyHasPullRequestFederatedCredential: Lazy<boolean>;
    lazyHasBranchFederatedCredential: Lazy<boolean>;
    lazySubscriptions: Lazy<Subscription[]>;
    lazyAcrResourceGroups: Lazy<string[]>;
    lazyClusterResourceGroups: Lazy<string[]>;
    lazyAcrs: Lazy<Acr[]>;
    lazyClusters: Lazy<Cluster[]>;
    lazyAcrAssignedRoles: Lazy<AcrRoleDefinition[]>;
    lazyClusterAssignedRoles: Lazy<ClusterRoleDefinition[]>;
};

function prepareData(state: AuthorizeGitHubWorkflowState, updates: EventHandlerFunc[]): LocalData {
    const lazyBranchNames = ensureGitHubRepoBranchNamesLoaded(
        state.gitHubReferenceData,
        state.selectedRepository,
        updates,
    );
    const {
        AZURE_TENANT_ID: lazyHasTenantIdSecret,
        AZURE_CLIENT_ID: lazyHasClientIdSecret,
        AZURE_SUBSCRIPTION_ID: lazyHasSubscriptionIdSecret,
    } = ensureGitHubRepoSecretStateLoaded(state.gitHubReferenceData, state.selectedRepository, updates);
    const lazyOwnedApplications = ensureOwnedApplicationsLoaded(state.azureReferenceData, updates);
    const lazyServicePrincipals = ensureServicePrincipalsLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        updates,
    );
    const lazyHasPullRequestFederatedCredential = ensurePullRequestFederatedCredentialLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        state.selectedRepository,
        updates,
    );
    const lazyHasBranchFederatedCredential = ensureBranchFederatedCredentialLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        state.selectedRepository,
        state.selectedBranch,
        updates,
    );
    const lazySubscriptions = ensureSubscriptionsLoaded(state.azureReferenceData, updates);
    const lazySubscriptionAcrs = ensureAcrsLoaded(state.azureReferenceData, state.selectedSubscription, updates);
    const lazyAcrResourceGroups = lazyMap(lazySubscriptionAcrs, (acrs) => distinct(acrs.map((a) => a.resourceGroup)));
    const lazySubscriptionClusters = ensureClustersLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        updates,
    );
    const lazyClusterResourceGroups = lazyMap(lazySubscriptionClusters, (clusters) =>
        distinct(clusters.map((c) => c.resourceGroup)),
    );
    const lazyAcrs = lazyMap(lazySubscriptionAcrs, (acrs) =>
        acrs.filter((a) => a.resourceGroup === state.selectedAcrResourceGroup),
    );
    const lazyClusters = lazyMap(lazySubscriptionClusters, (clusters) =>
        clusters.filter((c) => c.resourceGroup === state.selectedClusterResourceGroup),
    );
    const lazyAcrAssignedRoles = ensureAcrRoleAssignmentsLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        state.selectedAcr,
        state.selectedApplication,
        state.selectedServicePrincipal,
        updates,
    );
    const lazyClusterAssignedRoles = ensureClusterRoleAssignmentsLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        state.selectedCluster,
        state.selectedApplication,
        state.selectedServicePrincipal,
        updates,
    );

    return {
        lazyBranchNames,
        lazyHasTenantIdSecret,
        lazyHasClientIdSecret,
        lazyHasSubscriptionIdSecret,
        lazyOwnedApplications,
        lazyServicePrincipals,
        lazyHasPullRequestFederatedCredential,
        lazyHasBranchFederatedCredential,
        lazySubscriptions,
        lazyAcrResourceGroups,
        lazyClusterResourceGroups,
        lazyAcrs,
        lazyClusters,
        lazyAcrAssignedRoles,
        lazyClusterAssignedRoles,
    };
}
