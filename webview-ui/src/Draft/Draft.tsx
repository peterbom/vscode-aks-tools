import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { AcrData, ReferenceData, ResourceGroupData, SubscriptionData, stateUpdater, vscode } from "./state";
import { FormEvent, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { NewServiceDialog } from "./NewServiceDialog";
import { AzureResources } from "./AzureResources";
import { Service } from "./Service";
import { isLoaded, isLoading, isNotLoaded } from "../utilities/lazy";
import { hasValue } from "../utilities/maybe";

export function Draft(initialState: InitialState) {
    const {state, eventHandlers, vsCodeMessageHandlers} = getStateManagement(stateUpdater, initialState);

    useEffect(() => {
        vscode.subscribeToMessages(vsCodeMessageHandlers);
    }, []);

    useEffect(() => {
        if (isNotLoaded(state.referenceData.subscriptions)) {
            vscode.postGetSubscriptionsRequest();
            eventHandlers.onSetSubscriptionsLoading();
        }

        if (state.azureResources.selectedSubscription !== null) {
            const subscriptionId = state.azureResources.selectedSubscription.id;
            const lazySubscriptionData = ReferenceData.getSubscription(state.referenceData, subscriptionId);
            if (!isLoaded(lazySubscriptionData)) {
                return;
            }

            const maybeSubscriptionData = lazySubscriptionData.value;
            if (!hasValue(maybeSubscriptionData)) {
                // Not a known subscription.
                eventHandlers.onSetSubscription(null);
                return;
            }

            const subscriptionData = maybeSubscriptionData.value;
            if (state.azureResources.repositoryDefinition !== null) {
                const {resourceGroup, acrName, repositoryName} = state.azureResources.repositoryDefinition;
                const lazyResourceGroupData = SubscriptionData.getResourceGroup(subscriptionData, resourceGroup);
                if (isNotLoaded(lazyResourceGroupData)) {
                    vscode.postGetResourceGroupsRequest({subscriptionId});
                    eventHandlers.onSetResourceGroupsLoading({subscriptionId});
                    return;
                }

                if (isLoading(lazyResourceGroupData)) {
                    return;
                }

                const maybeResourceGroupData = lazyResourceGroupData.value;
                if (!hasValue(maybeResourceGroupData)) {
                    eventHandlers.onSetRepository(null);
                    return;
                }

                const resourceGroupData = maybeResourceGroupData.value;
                const lazyAcrData = ResourceGroupData.getAcr(resourceGroupData, acrName);
                if (isNotLoaded(lazyAcrData)) {
                    vscode.postGetAcrNamesRequest({subscriptionId, resourceGroup});
                    eventHandlers.onSetAcrsLoading({subscriptionId, resourceGroup});
                    return;
                }

                if (isLoading(lazyAcrData)) {
                    return;
                }

                const maybeAcrData = lazyAcrData.value;
                if (!hasValue(maybeAcrData)) {
                    eventHandlers.onSetRepository(null);
                    return;
                }

                const acrData = maybeAcrData.value;
                const lazyRepositoryData = AcrData.getRepository(acrData, repositoryName);
                if (isNotLoaded(lazyRepositoryData)) {
                    vscode.postGetRepositoriesRequest({subscriptionId, resourceGroup, acrName});
                    eventHandlers.onSetRepositoriesLoading({subscriptionId, resourceGroup, acrName});
                    return;
                }

                if (isLoading(lazyRepositoryData)) {
                    return;
                }

                const maybeRepositoryData = lazyRepositoryData.value;
                if (!hasValue(maybeRepositoryData)) {
                    eventHandlers.onSetRepository(null);
                    return;
                }

                const repositoryData = maybeRepositoryData.value;
                if (isNotLoaded(repositoryData.builtTags)) {
                    vscode.postGetBuiltTagsRequest({subscriptionId, resourceGroup, acrName, repositoryName});
                    eventHandlers.onSetBuiltTagsLoading({subscriptionId, resourceGroup, acrName, repositoryName});
                    return;
                }
            }

            if (state.azureResources.clusterDefinition !== null) {
                const {resourceGroup, name} = state.azureResources.clusterDefinition;
                const lazyResourceGroupData = SubscriptionData.getResourceGroup(subscriptionData, resourceGroup);
                if (isNotLoaded(lazyResourceGroupData)) {
                    vscode.postGetResourceGroupsRequest({subscriptionId});
                    eventHandlers.onSetResourceGroupsLoading({subscriptionId});
                    return;
                }

                if (isLoading(lazyResourceGroupData)) {
                    return;
                }

                const maybeResourceGroupData = lazyResourceGroupData.value;
                if (!hasValue(maybeResourceGroupData)) {
                    eventHandlers.onSetRepository(null);
                    return;
                }

                const resourceGroupData = maybeResourceGroupData.value;
                const lazyClusterData = ResourceGroupData.getCluster(resourceGroupData, name);
                if (isNotLoaded(lazyClusterData)) {
                    vscode.postGetClustersRequest({subscriptionId, resourceGroup});
                    eventHandlers.onSetClustersLoading({subscriptionId, resourceGroup});
                    return;
                }

                if (isLoading(lazyClusterData)) {
                    return;
                }

                const maybeClusterData = lazyClusterData.value;
                if (!hasValue(maybeClusterData)) {
                    eventHandlers.onSetCluster(null);
                    return;
                }

                const clusterData = maybeClusterData.value;
                if (isNotLoaded(clusterData.connectedAcrs)) {
                    // TODO: postGetConnectedAcrsRequest
                }
            }
        }
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
                referenceData={state.referenceData}
                resourcesState={state.azureResources}
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