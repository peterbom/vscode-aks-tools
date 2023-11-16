import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { InitialState, SavedClusterDefinition, SavedRepositoryDefinition, Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { ClusterReferenceData, ReferenceData, RepositoryReferenceData, SubscriptionReferenceData, stateUpdater, vscode } from "./state";
import { FormEvent, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { NewServiceDialog } from "./NewServiceDialog";
import { AzureResources } from "./AzureResources";
import { Service } from "./Service";
import { Lazy, isLoaded, newLoaded, newLoading, newNotLoaded } from "../utilities/lazy";
import { Maybe, hasValue, isNothing, nothing } from "../utilities/maybe";
import { EventHandlerFunc, loadAcrs, loadBuiltTags, loadClusters, loadRepositories, loadResourceGroups, loadSubscriptions, noop } from "./dataLoading";
import { tryGet } from "../utilities/array";

export function Draft(initialState: InitialState) {
    const {state, eventHandlers, vsCodeMessageHandlers} = getStateManagement(stateUpdater, initialState);

    useEffect(() => {
        vscode.subscribeToMessages(vsCodeMessageHandlers);
    }, []);

    const updates: EventHandlerFunc[] = [];
    const lazySubscriptionData = prepareSubscriptionData(state.referenceData, state.azureResources.selectedSubscription, updates);
    const lazyRepositoryData = prepareRepositoryData(lazySubscriptionData, state.azureResources.repositoryDefinition, updates);
    const lazyClusterData = prepareClusterData(lazySubscriptionData, state.azureResources.clusterDefinition, updates);

    useEffect(() => {
        updates.map(fn => fn(eventHandlers));
    });

    function handleSelectedServiceChange(e: Event | FormEvent<HTMLElement>) {
        const elem = e.target as HTMLInputElement;
        const serviceName = elem.value ? elem.value : null;
        eventHandlers.onSetSelectedService(serviceName);
    }

    const selectedServiceState = state.selectedService ? state.services.find(s => s.name === state.selectedService) : null;

    return (
    <>
        <h2>Draft for {state.workspaceName}</h2>

        {/*
        Place Azure resource selection above service selection, since this applies to _all_ services.
        However, if we don't have _any_ services, it makes no sense for the user to select cluster/ACR,
        so only show this if we have at least one service.
        */}
        {state.services.length > 0 && (
            <AzureResources
                resourcesState={state.azureResources}
                subscriptionsData={state.referenceData.subscriptions}
                subscriptionData={lazySubscriptionData}
                repositoryData={lazyRepositoryData}
                clusterData={lazyClusterData}
                eventHandlers={eventHandlers}
            />
        )}

        <VSCodeDivider style={{paddingBottom: "0.5rem"}}/>

        <div className={styles.inputContainer}>
            {state.services.length === 0 && (
            <>
                <p className={styles.fullWidth}>
                    <FontAwesomeIcon className={styles.infoIndicator} icon={faInfoCircle} />
                    You have not configured any services for your workspace.
                    If {state.workspaceName} contains code for one or more services for deployment to a Kubernetes cluster,
                    click below to allow Draft to configure them.
                </p>
                <VSCodeButton onClick={() => eventHandlers.onSetNewServiceDialogShown(true)}>Create Service</VSCodeButton>
            </>
            )}
            {state.services.length > 0 && (
            <>
                <label htmlFor="service-dropdown" className={styles.label}>Service</label>
                <VSCodeDropdown value={state.selectedService || undefined} id="service-dropdown" onChange={handleSelectedServiceChange}>
                    {state.services.length > 1 && <VSCodeOption value="">Select</VSCodeOption>}
                    {state.services.map(s => (
                        <VSCodeOption key={s.name} value={s.name}>{s.name}</VSCodeOption>
                    ))}
                </VSCodeDropdown>
            </>
            )}
        </div>

        <NewServiceDialog
            isShown={state.isNewServiceDialogShown}
            existingNames={state.services.map(s => s.name)}
            eventHandlers={eventHandlers}
        />

        {selectedServiceState && state.azureResources && <Service azureResourceState={state.azureResources} serviceState={selectedServiceState} eventHandlers={eventHandlers} />}
    </>
    );
}

function prepareSubscriptionData(referenceData: ReferenceData, selectedSubscription: Subscription | null, updates: EventHandlerFunc[]): Lazy<Maybe<SubscriptionReferenceData>> {
    let returnValue: Lazy<Maybe<SubscriptionReferenceData>> = selectedSubscription ? newLoading() : newLoaded(nothing());

    if (!isLoaded(referenceData.subscriptions)) {
        updates.push(loadSubscriptions(referenceData));
        return returnValue;
    }

    if (selectedSubscription !== null) {
        const subscriptionData = tryGet(referenceData.subscriptions.value, sub => sub.subscription.id === selectedSubscription.id);
        returnValue = newLoaded(subscriptionData);
        if (isNothing(subscriptionData)) {
            // Our selected subscription is not known. Reset it.
            updates.push(e => e.onSetSubscription(null));
        }
    }

    return returnValue;
}

function prepareRepositoryData(lazySubscriptionData: Lazy<Maybe<SubscriptionReferenceData>>, repositoryDefinition: SavedRepositoryDefinition | null, updates: EventHandlerFunc[]): Lazy<Maybe<RepositoryReferenceData>> {
    let returnValue: Lazy<Maybe<RepositoryReferenceData>> = repositoryDefinition ? newLoading() : newLoaded(nothing()) as Lazy<Maybe<RepositoryReferenceData>>;

    const subscriptionData = isLoaded(lazySubscriptionData) && hasValue(lazySubscriptionData.value) ? lazySubscriptionData.value.value : null;
    if (!subscriptionData || !repositoryDefinition) {
        return returnValue;
    }

    const {resourceGroup, acrName, repositoryName} = repositoryDefinition;
    const lazyResourceGroupsData = subscriptionData.resourceGroups;
    if (!isLoaded(lazyResourceGroupsData)) {
        updates.push(loadResourceGroups(subscriptionData));
        return returnValue;
    }

    const resourceGroupData = tryGet(lazyResourceGroupsData.value, group => group.key.resourceGroup === resourceGroup);
    if (isNothing(resourceGroupData)) {
        // Not a known resource group, so the repository configuration is invalid. Reset it.
        updates.push(e => e.onSetRepository(null));
        return returnValue;
    }

    const lazyAcrsData = resourceGroupData.value.acrs;
    if (!isLoaded(lazyAcrsData)) {
        updates.push(loadAcrs(resourceGroupData.value));
        return returnValue;
    }

    const acrData = tryGet(lazyAcrsData.value, acr => acr.key.acrName === acrName);
    if (isNothing(acrData)) {
        // Not a known ACR, so the repository configuration is invalid. Reset it.
        updates.push(e => e.onSetRepository(null));
        return returnValue;
    }

    const lazyRepositoriesData = acrData.value.repositories;
    if (!isLoaded(lazyRepositoriesData)) {
        updates.push(loadRepositories(acrData.value));
        return returnValue;
    }

    const repositoryData = tryGet(lazyRepositoriesData.value, repo => repo.key.repositoryName === repositoryName);
    returnValue = newLoaded(repositoryData);
    if (isNothing(repositoryData)) {
        // Not a known repository, so the repository configuration is invalid. Reset it.
        updates.push(e => e.onSetRepository(null));
        return returnValue;
    }

    const lazyBuiltTags = repositoryData.value.builtTags;
    if (!isLoaded(lazyBuiltTags)) {
        updates.push(loadBuiltTags(repositoryData.value));
    }

    return returnValue;
}

function prepareClusterData(lazySubscriptionData: Lazy<Maybe<SubscriptionReferenceData>>, clusterDefinition: SavedClusterDefinition | null, updates: EventHandlerFunc[]): Lazy<Maybe<ClusterReferenceData>> {
    let returnValue: Lazy<Maybe<ClusterReferenceData>> = clusterDefinition ? newLoading() : newLoaded(nothing()) as Lazy<Maybe<ClusterReferenceData>>;

    const subscriptionData = isLoaded(lazySubscriptionData) && hasValue(lazySubscriptionData.value) ? lazySubscriptionData.value.value : null;
    if (!subscriptionData || !clusterDefinition) {
        return returnValue;
    }

    const {resourceGroup, name: clusterName} = clusterDefinition;
    const lazyResourceGroupsData = subscriptionData.resourceGroups;
    if (!isLoaded(lazyResourceGroupsData)) {
        updates.push(loadResourceGroups(subscriptionData));
        return returnValue;
    }

    const resourceGroupData = tryGet(lazyResourceGroupsData.value, group => group.key.resourceGroup === resourceGroup);
    if (isNothing(resourceGroupData)) {
        // Not a known resource group, so the cluster configuration is invalid. Reset it.
        updates.push(e => e.onSetCluster(null));
        return returnValue;
    }

    const lazyClustersData = resourceGroupData.value.clusters;
    if (!isLoaded(lazyClustersData)) {
        updates.push(loadClusters(resourceGroupData.value));
        return returnValue;
    }

    const clusterData = tryGet(lazyClustersData.value, cluster => cluster.key.clusterName === clusterName);
    returnValue = newLoaded(clusterData);
    if (isNothing(clusterData)) {
        // Not a known cluster, so the cluster configuration is invalid. Reset it.
        updates.push(e => e.onSetCluster(null));
    }

    // TODO: loadConnectedAcrs (and postGetConnectedAcrsRequest)

    return returnValue;
}