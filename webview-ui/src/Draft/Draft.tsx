import styles from "./Draft.module.css";
import { VSCodeButton, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { InitialState } from "../../../src/webview-contract/webviewDefinitions/draft";
import { getStateManagement } from "../utilities/state";
import { stateUpdater, vscode } from "./state";
import { FormEvent, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { NewServiceDialog } from "./NewServiceDialog";
import { AzureResources } from "./AzureResources";
import { Service } from "./Service";
import { isNotLoaded } from "../utilities/lazy";

export function Draft(initialState: InitialState) {
    const {state, eventHandlers, vsCodeMessageHandlers} = getStateManagement(stateUpdater, initialState);

    useEffect(() => {
        vscode.subscribeToMessages(vsCodeMessageHandlers);
    }, []);

    useEffect(() => {
        if (isNotLoaded(state.azureResources.availableSubscriptions)) {
            vscode.postGetSubscriptionsRequest();
            eventHandlers.onSetSubscriptionsLoading();
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