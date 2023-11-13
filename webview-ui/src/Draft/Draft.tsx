import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { getSubscriptionReferenceData, stateUpdater, vscode } from "./state";
import { FormEvent, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { NewServiceDialog } from "./NewServiceDialog";
import { AzureResources } from "./AzureResources";
import { Service } from "./Service";
import { isLoaded, isNotLoaded } from "../utilities/lazy";

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

        if (state.azureResources.selectedSubscription !== null && isLoaded(state.referenceData.subscriptions)) {
            const subscriptionId = state.azureResources.selectedSubscription.id;
            const subscriptionData = state.referenceData.subscriptions.value.find(s => s.subscription.id === subscriptionId);
            if (!subscriptionData) {
                // The saved subscription is no longer accessible.
                eventHandlers.onSetSubscription(null);
                return;
            }

            if (isNotLoaded(subscriptionData.resourceGroups)) {
                vscode.postGetResourceGroupsRequest({subscriptionId});
                eventHandlers.onSetResourceGroupsLoading({subscriptionId});
                return;
            } else if (!isLoaded(subscriptionData.resourceGroups)) {
                return;
            }

            if (state.azureResources.repositoryDefinition !== null) {
                const {resourceGroup, acrName, repositoryName} = state.azureResources.repositoryDefinition;
                const resourceGroupData = subscriptionData.resourceGroups.value.find(group => group.name === resourceGroup);
                if (!resourceGroupData) {
                    // The repository resource group is no longer accessible.
                    eventHandlers.onSetRepository(null);
                    return;
                }

                if (isNotLoaded(resourceGroupData.acrs)) {
                    vscode.postGetAcrNamesRequest({subscriptionId, resourceGroup});
                    eventHandlers.onSetAcrsLoading({subscriptionId, resourceGroup});
                    return;
                } else if (!isLoaded(resourceGroupData.acrs)) {
                    return;
                }

                const acrData = resourceGroupData.acrs.value.find(acr => acr.name === acrName);
                if (!acrData) {
                    // The ACR is no longer accessible.
                    eventHandlers.onSetRepository(null);
                    return;
                }

                if (isNotLoaded(acrData.repositories)) {
                    vscode.postGetRepositoriesRequest({subscriptionId, resourceGroup, acrName});
                    eventHandlers.onSetRepositoriesLoading({subscriptionId, resourceGroup, acrName});
                    return;
                } else if (!isLoaded(acrData.repositories)) {
                    return;
                }

                const repositoryData = acrData.repositories.value.find(repo => repo.name === repositoryName);
                if (!repositoryData) {
                    // The repo is no longer accessible.
                    eventHandlers.onSetRepository(null);
                    return;
                }

                if (isNotLoaded(repositoryData.builtTags)) {
                    vscode.postGetBuiltTagsRequest({subscriptionId, resourceGroup, acrName, repositoryName});
                    eventHandlers.onSetBuiltTagsLoading({subscriptionId, resourceGroup, acrName, repositoryName});
                    return;
                } else if (!isLoaded(repositoryData.builtTags)) {
                    return;
                }
            }

            if (state.azureResources.clusterDefinition !== null) {
                const {resourceGroup, name} = state.azureResources.clusterDefinition;
                const resourceGroupData = subscriptionData.resourceGroups.value.find(group => group.name === resourceGroup);
                if (!resourceGroupData) {
                    // The cluster resource group is no longer accessible.
                    eventHandlers.onSetCluster(null);
                    return;
                }
            }

            // const usedResourceGroups = [
            //     state.azureResources.clusterDefinition?.resourceGroup,
            //     state.azureResources.repositoryDefinition?.resourceGroup
            // ].filter(g => !!g) as string[];
            // if (usedResourceGroups.length > 0 && isLoaded(subscriptionData.resourceGroups)) {
            //     for (const usedResourceGroup of usedResourceGroups) {
            //         const resourceGroupData = subscriptionData.resourceGroups.value.find(group => group.name === usedResourceGroup)
            //     }
            // }
            // if (!state.azureResources.repositoryDefinition) {

            // }
        }

        if (state.azureResources.selectedSubscription && isLoaded(state.referenceData.subscriptions) && isNotLoaded(state.referenceData.subscriptions)) {
            vscode.postGetResourceGroupsRequest(state.azureResources.selectedSubscription.id);
            eventHandlers.onSetResourceGroupsLoading();
        }

        if (state.azureResources.selectedSubscription && state.azureResources.repositoryDefinition && isNotLoaded(state.azureResources.builtTags)) {
            vscode.postGetBuiltTagsRequest({
                subscriptionId: state.azureResources.selectedSubscription.id,
                acrName: state.azureResources.repositoryDefinition.acrName,
                repositoryName: state.azureResources.repositoryDefinition.repositoryName
            });
            eventHandlers.onSetBuiltTagsLoading();
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