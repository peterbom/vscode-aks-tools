import { SavedClusterDefinition, SavedRepositoryDefinition, SavedService, Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem } from "../utilities/array";
import { Lazy, newLoaded, newLoading, newNotLoaded } from "../utilities/lazy";
import { WebviewStateUpdater } from "../utilities/state";
import { getWebviewMessageContext } from "../utilities/vscode";

export type EventDef = {
    setNewServiceDialogShown: boolean;
    createNewService: string;
    setSelectedService: string | null;
    setSubscriptionsLoading: void;
    setResourceGroupsLoading: void;
    setSubscription: Subscription | null;
    setRepositoryDialogShown: boolean;
    setRepository: SavedRepositoryDefinition | null;
    setBuiltTagsLoading: void;
};

export type AzureResourcesState = {
    availableSubscriptions: Lazy<Subscription[]>;
    selectedSubscription: Subscription | null;
    availableResourceGroups: Lazy<string[]>;
    clusterDefinition: SavedClusterDefinition | null;
    repositoryDefinition: SavedRepositoryDefinition | null;
    isRepositoryDialogShown: boolean;
    builtTags: Lazy<string[]>;
};

export type ServicesState = SavedService;

export type DraftState = {
    workspaceName: string;
    azureResources: AzureResourcesState;
    services: ServicesState[];
    selectedService: string | null;
    isNewServiceDialogShown: boolean;
};

export const stateUpdater: WebviewStateUpdater<"draft", EventDef, DraftState> = {
    createState: initialState => ({
        workspaceName: initialState.workspaceName,
        azureResources: {
            selectedSubscription: initialState.savedAzureResources?.subscription || null,
            clusterDefinition: initialState.savedAzureResources?.clusterDefinition || null,
            repositoryDefinition: initialState.savedAzureResources?.repositoryDefinition || null,
            availableSubscriptions: newNotLoaded(),
            availableResourceGroups: newNotLoaded(),
            isRepositoryDialogShown: false,
            builtTags: newNotLoaded()
        },
        services: initialState.savedServices,
        selectedService: initialState.savedServices.length === 1 ? initialState.savedServices[0].name : null,
        isNewServiceDialogShown: false
    }),
    vscodeMessageHandler: {
        getSubscriptionsResponse: (state, subs) => ({...state, azureResources: {...state.azureResources, availableSubscriptions: newLoaded(subs)}}),
        // TODO: Check args match selected
        getResourceGroupsResponse: (state, args) => ({...state, azureResources: {...state.azureResources, availableResourceGroups: newLoaded(args.groups)}}),
        getBuiltTagsResponse: (state, args) => ({...state, azureResources: {...state.azureResources, builtTags: newLoaded(args.tags)}})
    },
    eventHandler: {
        setNewServiceDialogShown: (state, shown) => ({...state, isNewServiceDialogShown: shown}),
        createNewService: (state, name) => ({...state, selectedService: name, isNewServiceDialogShown: false, services: [...state.services, {
            name,
            buildConfig: null,
            deploymentSpec: null,
            gitHubWorkflow: null
        }]}),
        setSelectedService: (state, selectedService) => ({...state, selectedService}),
        setSubscriptionsLoading: (state) => ({...state, azureResources: {...state.azureResources, availableSubscriptions: newLoading()}}),
        setResourceGroupsLoading: (state) => ({...state, azureResources: {...state.azureResources, availableResourceGroups: newLoading()}}),
        setSubscription: (state, subscription) => ({...state, azureResources: {...state.azureResources, selectedSubscription: subscription, clusterDefinition: null, repositoryDefinition: null}}),
        setRepositoryDialogShown: (state, shown) => ({...state, azureResources: {...state.azureResources, isRepositoryDialogShown: shown}}),
        setRepository: (state, repositoryDefinition) => ({...state, azureResources: {...state.azureResources, repositoryDefinition}}),
        setBuiltTagsLoading: (state) => ({...state, azureResources: {...state.azureResources, builtTags: newLoading()}})
    }
};

function updateServices(services: ServicesState[], serviceName: string, updater: (service: ServicesState) => ServicesState): ServicesState[] {
    return replaceItem(services, s => s.name === serviceName, updater);
}

export const vscode = getWebviewMessageContext<"draft">({
    createNewService: null,
    getSubscriptionsRequest: null,
    getResourceGroupsRequest: null,
    getBuiltTagsRequest: null
});