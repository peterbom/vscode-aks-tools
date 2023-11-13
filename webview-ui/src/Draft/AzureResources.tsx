import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef, ReferenceData } from "./state";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { SavedRepositoryDefinition, Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { RepositoryDialog } from "./RepositoryDialog";
import { ResourceSelector } from "../components/ResourceSelector";
import { map as lazyMap } from "../utilities/lazy";

export interface AzureResourcesProps {
    referenceData: ReferenceData;
    resourcesState: AzureResourcesState;
    eventHandlers: EventHandlers<EventDef>;
}

export function AzureResources(props: AzureResourcesProps) {
    return (
    <>
        <div className={styles.inputContainer}>
            <label htmlFor="subscription" className={styles.label}>Subscription</label>
            <ResourceSelector<Subscription>
                id="subscription"
                className={styles.midControl}
                resources={lazyMap(props.referenceData.subscriptions, subs => subs.map(s => s.subscription))}
                selectedItem={props.resourcesState.selectedSubscription}
                valueGetter={s => s.id}
                labelGetter={s => s.name}
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
                <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetRepositoryDialogShown(true)}>Change</VSCodeButton>
            </>
            )}
            {!props.resourcesState.repositoryDefinition}
        </div>

        {props.resourcesState.selectedSubscription && <RepositoryDialog
            isShown={props.resourcesState.isRepositoryDialogShown}
            subscription={props.resourcesState.selectedSubscription}
            referenceData={props.referenceData}
            eventHandlers={props.eventHandlers}
        />}
    </>
    );
}

function getRepositoryName(definition: SavedRepositoryDefinition): string {
    return `${definition.acrName}.azurecr.io/${definition.repositoryName}`;
}