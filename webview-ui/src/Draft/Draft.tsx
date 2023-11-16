import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { ImageTag, InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { RepositoryReferenceData, SubscriptionReferenceData, stateUpdater, vscode } from "./state";
import { FormEvent, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { NewServiceDialog } from "./NewServiceDialog";
import { AzureResources } from "./AzureResources";
import { Service } from "./Service";
import { Lazy, isLoaded, newLoaded, newLoading } from "../utilities/lazy";
import { Maybe, isNothing } from "../utilities/maybe";
import { loadAcrs, loadBuiltTags, loadClusters, loadRepositories, loadResourceGroups, loadSubscriptions } from "./dataLoading";
import { tryGet } from "../utilities/array";

export function Draft(initialState: InitialState) {
    const {state, eventHandlers, vsCodeMessageHandlers} = getStateManagement(stateUpdater, initialState);

    useEffect(() => {
        vscode.subscribeToMessages(vsCodeMessageHandlers);
    }, []);

    const subscriptionsData = state.referenceData.subscriptions;
    let lazySubscriptionData: Lazy<Maybe<SubscriptionReferenceData>> = newLoading();
    let lazyRepositoryData: Lazy<Maybe<RepositoryReferenceData>> = newLoading();
    let lazyBuiltTags: Lazy<ImageTag[]> = newLoading();

    (function prepareData() {
        if (!isLoaded(subscriptionsData)) {
            loadSubscriptions(state.referenceData, eventHandlers);
            return;
        }
    
        if (state.azureResources.selectedSubscription !== null) {
            const subscriptionId = state.azureResources.selectedSubscription.id;
            const subscriptionData = tryGet(subscriptionsData.value, sub => sub.subscription.id === subscriptionId);
            lazySubscriptionData = newLoaded(subscriptionData);
            if (isNothing(subscriptionData)) {
                // Our selected subscription is not known. Reset it.
                eventHandlers.onSetSubscription(null);
                return;
            }
    
            if (state.azureResources.repositoryDefinition !== null) {
                const {resourceGroup, acrName, repositoryName} = state.azureResources.repositoryDefinition;
                const lazyResourceGroupsData = subscriptionData.value.resourceGroups;
                if (!isLoaded(lazyResourceGroupsData)) {
                    loadResourceGroups(subscriptionData.value, eventHandlers)
                    return;
                }
    
                const resourceGroupData = tryGet(lazyResourceGroupsData.value, group => group.key.resourceGroup === resourceGroup);
                if (isNothing(resourceGroupData)) {
                    // Not a known resource group, so the repository configuration is invalid. Reset it.
                    eventHandlers.onSetRepository(null);
                    return;
                }
    
                const lazyAcrsData = resourceGroupData.value.acrs;
                if (!isLoaded(lazyAcrsData)) {
                    loadAcrs(resourceGroupData.value, eventHandlers)
                    return;
                }
    
                const acrData = tryGet(lazyAcrsData.value, acr => acr.key.acrName === acrName);
                if (isNothing(acrData)) {
                    // Not a known ACR, so the repository configuration is invalid. Reset it.
                    eventHandlers.onSetRepository(null);
                    return;
                }
    
                const lazyRepositoriesData = acrData.value.repositories;
                if (!isLoaded(lazyRepositoriesData)) {
                    loadRepositories(acrData.value, eventHandlers);
                    return;
                }
    
                const repositoryData = tryGet(lazyRepositoriesData.value, repo => repo.key.repositoryName === repositoryName);
                lazyRepositoryData = newLoaded(repositoryData);
                if (isNothing(repositoryData)) {
                    // Not a known repository, so the repository configuration is invalid. Reset it.
                    eventHandlers.onSetRepository(null);
                    return;
                }
    
                lazyBuiltTags = repositoryData.value.builtTags;
                if (!isLoaded(lazyBuiltTags)) {
                    loadBuiltTags(repositoryData.value, eventHandlers);
                    return;
                }
            }
    
            if (state.azureResources.clusterDefinition !== null) {
                const {resourceGroup, name} = state.azureResources.clusterDefinition;
                const lazyResourceGroupsData = subscriptionData.value.resourceGroups;
                if (!isLoaded(lazyResourceGroupsData)) {
                    loadResourceGroups(subscriptionData.value, eventHandlers);
                    return;
                }
    
                const resourceGroupData = tryGet(lazyResourceGroupsData.value, group => group.key.resourceGroup === resourceGroup);
                if (isNothing(resourceGroupData)) {
                    // Not a known resource group, so the cluster configuration is invalid. Reset it.
                    eventHandlers.onSetCluster(null);
                    return;
                }
    
                const lazyClustersData = resourceGroupData.value.clusters;
                if (!isLoaded(lazyClustersData)) {
                    loadClusters(resourceGroupData.value, eventHandlers);
                    return;
                }
    
                const clusterData = tryGet(lazyClustersData.value, cluster => cluster.key.clusterName === name);
                if (isNothing(clusterData)) {
                    // Not a known cluster, so the cluster configuration is invalid. Reset it.
                    eventHandlers.onSetCluster(null);
                }
    
                // TODO: loadConnectedAcrs (and postGetConnectedAcrsRequest)
            }
        }
    })();

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
                subscriptionsData={subscriptionsData}
                subscriptionData={lazySubscriptionData}
                repositoryData={lazyRepositoryData}
                builtTags={lazyBuiltTags}
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