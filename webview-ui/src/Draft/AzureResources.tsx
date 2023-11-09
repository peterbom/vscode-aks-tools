import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef } from "./state";
import { SubscriptionSelector } from "./SubscriptionSelector";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { SavedRepositoryDefinition } from "../../../src/webview-contract/webviewDefinitions/draft";

export interface AzureResourcesProps {
    resourcesState: AzureResourcesState;
    eventHandlers: EventHandlers<EventDef>;
}

export function AzureResources(props: AzureResourcesProps) {
    function handleChangeRepository() {
        //TODO:
    }

    return (
    <div className={styles.inputContainer}>
        <label htmlFor="subscription" className={styles.label}>Subscription</label>
        <SubscriptionSelector
            id="subscription"
            className={styles.midControl}
            subscriptions={props.resourcesState.availableSubscriptions}
            selectedValue={props.resourcesState.selectedSubscription}
            onSelect={props.eventHandlers.onSetSubscription}
        />

        <label htmlFor="repository" className={styles.label}>Repository</label>
        {props.resourcesState.repositoryDefinition && (
        <>
            <VSCodeTextField
                id="repository"
                className={styles.midControl}
                value={getRepositoryName(props.resourcesState.repositoryDefinition)}
                readOnly={true}
            />
            <VSCodeButton appearance="secondary" onClick={handleChangeRepository}>Change</VSCodeButton>
        </>
        )}
        {!props.resourcesState.repositoryDefinition}
    </div>
    );
}

function getRepositoryName(definition: SavedRepositoryDefinition): string {
    return `${definition.acrName}.azurecr.io/${definition.repositoryName}`;
}