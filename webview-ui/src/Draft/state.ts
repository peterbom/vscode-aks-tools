import {
    AcrKey,
    ClusterKey,
    ImageTag,
    PickFileSituation,
    PickFolderSituation,
    RepositoryKey,
    ResourceGroupKey,
    SavedClusterDefinition,
    SavedRepositoryDefinition,
    SavedService,
    Subscription,
    SubscriptionKey,
    WorkspaceConfig,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import {
    OpenFileResult,
    SaveFileResult,
} from "../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";
import { replaceItem } from "../utilities/array";
import { Lazy, newNotLoaded } from "../utilities/lazy";
import { WebviewStateUpdater } from "../utilities/state";
import { getWebviewMessageContext } from "../utilities/vscode";
import {
    AllDialogsState,
    DialogContentValue,
    DialogVisibilityValue,
    updateDialogContent,
    updateDialogVisibility,
} from "./state/dialogs";
import * as ReferenceDataUpdate from "./state/referenceDataUpdate";
import * as ServiceUpdate from "./state/serviceUpdate";

export type EventDef = {
    setSubscriptionsLoading: void;
    setResourceGroupsLoading: SubscriptionKey;
    setAcrsLoading: ResourceGroupKey;
    setRepositoriesLoading: AcrKey;
    setBuiltTagsLoading: RepositoryKey;
    setClustersLoading: ResourceGroupKey;
    setConnectedAcrsLoading: ClusterKey;
    setDialogVisibility: DialogVisibilityValue;
    setDialogContent: DialogContentValue;
    createNewService: SavedService;
    setSelectedService: string | null;
    setSubscription: Subscription | null;
    setRepository: SavedRepositoryDefinition | null;
    setCluster: SavedClusterDefinition | null;
};

export type ReferenceData = {
    subscriptions: Lazy<SubscriptionReferenceData[]>;
};

export type SubscriptionReferenceData = {
    subscription: Subscription;
    resourceGroups: Lazy<ResourceGroupReferenceData[]>;
};

export type ResourceGroupReferenceData = {
    key: ResourceGroupKey;
    acrs: Lazy<AcrReferenceData[]>;
    clusters: Lazy<ClusterReferenceData[]>;
};

export type AcrReferenceData = {
    key: AcrKey;
    repositories: Lazy<RepositoryReferenceData[]>;
};

export type RepositoryReferenceData = {
    key: RepositoryKey;
    builtTags: Lazy<ImageTag[]>;
};

export type ClusterReferenceData = {
    key: ClusterKey;
    connectedAcrs: Lazy<AcrKey[]>;
};

export type AzureResourcesState = {
    selectedSubscription: Subscription | null;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
    isSubscriptionDialogShown: boolean;
    isRepositoryDialogShown: boolean;
    isClusterDialogShown: boolean;
};

export type ServiceState = SavedService;

export type DraftState = {
    workspaceConfig: WorkspaceConfig;
    referenceData: ReferenceData;
    azureResources: AzureResourcesState;
    services: ServiceState[];
    selectedService: string | null;
    allDialogsState: AllDialogsState;
};

export const stateUpdater: WebviewStateUpdater<"draft", EventDef, DraftState> = {
    createState: (initialState) => ({
        workspaceConfig: initialState.workspaceConfig,
        referenceData: {
            subscriptions: newNotLoaded(),
        },
        azureResources: {
            selectedSubscription: initialState.savedAzureResources?.subscription || null,
            clusterDefinition: initialState.savedAzureResources?.clusterDefinition || null,
            repositoryDefinition: initialState.savedAzureResources?.repositoryDefinition || null,
            isSubscriptionDialogShown: false,
            isRepositoryDialogShown: false,
            isClusterDialogShown: false,
        },
        services: initialState.savedServices,
        selectedService: initialState.savedServices.length === 1 ? initialState.savedServices[0].name : null,
        allDialogsState: {
            clusterState: { shown: false, content: {} },
            repositoryState: { shown: false, content: {} },
            serviceState: { shown: false, content: {} },
            subscriptionState: { shown: false, content: {} },
        },
    }),
    vscodeMessageHandler: {
        getSubscriptionsResponse: (state, subs) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateSubscriptions(state.referenceData, subs),
        }),
        getResourceGroupsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateResourceGroups(
                state.referenceData,
                args.subscriptionId,
                args.groups,
            ),
        }),
        getAcrNamesResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateAcrNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrNames,
            ),
        }),
        getRepositoriesResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateRepositoryNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryNames,
            ),
        }),
        getBuiltTagsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateBuiltTags(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryName,
                args.tags,
            ),
        }),
        getClustersResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateClusterNames(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterNames,
            ),
        }),
        getConnectedAcrsResponse: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.updateConnectedAcrs(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterName,
                args.acrs,
            ),
        }),
        pickFileResponse: (state, args) => handlePickFileResponse(state, args.situation, args.result),
        pickFolderResponse: (state, args) => handlePickFolderResponse(state, args.situation, args.result),
    },
    eventHandler: {
        setSubscriptionsLoading: (state) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setSubscriptionsLoading(state.referenceData),
        }),
        setResourceGroupsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setResourceGroupsLoading(state.referenceData, args.subscriptionId),
        }),
        setAcrsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setAcrsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
            ),
        }),
        setRepositoriesLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setRepositoriesLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
            ),
        }),
        setBuiltTagsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setBuiltTagsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.acrName,
                args.repositoryName,
            ),
        }),
        setClustersLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setClustersLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
            ),
        }),
        setConnectedAcrsLoading: (state, args) => ({
            ...state,
            referenceData: ReferenceDataUpdate.setConnectedAcrsLoading(
                state.referenceData,
                args.subscriptionId,
                args.resourceGroup,
                args.clusterName,
            ),
        }),
        setDialogVisibility: (state, visibilityValue) => ({
            ...state,
            allDialogsState: updateDialogVisibility(state.allDialogsState, visibilityValue),
        }),
        setDialogContent: (state, contentValue) => ({
            ...state,
            allDialogsState: updateDialogContent(state.allDialogsState, contentValue),
        }),
        createNewService: (state, service) => ({
            ...state,
            selectedService: service.name,
            isNewServiceDialogShown: false,
            services: [...state.services, service],
        }),
        setSelectedService: (state, selectedService) => ({ ...state, selectedService }),
        setSubscription: (state, subscription) => ({
            ...state,
            azureResources: {
                ...state.azureResources,
                selectedSubscription: subscription,
                clusterDefinition: null,
                repositoryDefinition: null,
            },
        }),
        setRepository: (state, repositoryDefinition) => ({
            ...state,
            azureResources: { ...state.azureResources, repositoryDefinition },
        }),
        setCluster: (state, clusterDefinition) => ({
            ...state,
            azureResources: { ...state.azureResources, clusterDefinition },
        }),
    },
};

function handlePickFileResponse(state: DraftState, situation: PickFileSituation, result: SaveFileResult): DraftState {
    switch (situation) {
        case PickFileSituation.DockerfilePath:
            return updateSelectedService(state, (svc) => ServiceUpdate.updateDockerfilePath(svc, result));
    }
}

function handlePickFolderResponse(
    state: DraftState,
    situation: PickFolderSituation,
    result: OpenFileResult,
): DraftState {
    state.allDialogsState.serviceState.content.relativePath;
    switch (situation) {
        case PickFolderSituation.NewServicePath:
            return {
                ...state,
                allDialogsState: updateDialogContent(state.allDialogsState, {
                    dialog: "service",
                    content: { ...state.allDialogsState.serviceState.content, relativePath: result.path },
                }),
            };
        case PickFolderSituation.DeploymentSpecPath:
            throw new Error("Not implemented");
        case PickFolderSituation.GitHubWorkflowFilePath:
            throw new Error("Not implemented");
    }
}

function updateSelectedService(state: DraftState, updater: (serviceState: ServiceState) => ServiceState): DraftState {
    if (!state.selectedService) return state;
    return {
        ...state,
        services: replaceItem(state.services, (s) => s.name === state.selectedService, updater),
    };
}

export const vscode = getWebviewMessageContext<"draft">({
    createNewService: null,
    getSubscriptionsRequest: null,
    getResourceGroupsRequest: null,
    getAcrNamesRequest: null,
    getRepositoriesRequest: null,
    getBuiltTagsRequest: null,
    getClustersRequest: null,
    getConnectedAcrsRequest: null,
    pickFileRequest: null,
    pickFolderRequest: null,
});
