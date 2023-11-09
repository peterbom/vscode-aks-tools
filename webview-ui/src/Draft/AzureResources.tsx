import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef } from "./state";
import { SubscriptionSelector } from "./SubscriptionSelector";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

export interface AzureResourcesProps {
    resourcesState: AzureResourcesState;
    eventHandlers: EventHandlers<EventDef>;
}

export function AzureResources(props: AzureResourcesProps) {
    const anyResourcesSelected =
        props.resourcesState.clusterDefinition !== null ||
        props.resourcesState.repositoryDefinition !== null;

    return (
    <div className={styles.inputContainer}>
        <label htmlFor="subscription" className={styles.label}>Subscription</label>
        {!anyResourcesSelected && (
            <SubscriptionSelector
                id="subscription"
                className={styles.midControl}
                subscriptions={props.resourcesState.availableSubscriptions}
                selectedValue={props.resourcesState.selectedSubscription}
                onSelect={props.eventHandlers.onSetSubscription}
            />
        )}
        {props.resourcesState.selectedSubscription && anyResourcesSelected && (
        <>
            <VSCodeTextField
                id="subscription"
                readOnly={true}
                value={props.resourcesState.selectedSubscription.name}
                className={styles.midControl}
            />
            <VSCodeButton appearance="secondary" className={styles.sideControl}>Change</VSCodeButton>
        </>
        )}
    </div>
    );
}