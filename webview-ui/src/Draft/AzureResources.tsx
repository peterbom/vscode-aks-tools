import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef, ReferenceData } from "./state";
import { VSCodeButton, VSCodeProgressRing, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { AcrName, RepositoryKey, RepositoryName, SavedRepositoryDefinition, Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { RepositoryDialog } from "./RepositoryDialog";
import { ResourceSelector } from "../components/ResourceSelector";
import { isLoaded, isLoading, map as lazyMap, newLoaded } from "../utilities/lazy";
import { hasValue, nothing } from "../utilities/maybe";

export interface AzureResourcesProps {
    referenceData: ReferenceData;
    resourcesState: AzureResourcesState;
    eventHandlers: EventHandlers<EventDef>;
}

export function AzureResources(props: AzureResourcesProps) {
    const repoKey = getRepositoryKey(props);
    const lazyRepoData = repoKey ? ReferenceData.getRepository(props.referenceData, repoKey.subscriptionId, repoKey.resourceGroup, repoKey.acrName, repoKey.repositoryName) : newLoaded(nothing());
    const isLoadingRepoData = isLoading(lazyRepoData);
    const isLoadedRepoData = isLoaded(lazyRepoData);
    const loadedRepoData = isLoadedRepoData && hasValue(lazyRepoData.value) ? lazyRepoData.value.value : null;
    const fullRepoName = repoKey ? getFullRepositoryName(repoKey.acrName, repoKey.repositoryName) : "";

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
            {isLoadingRepoData && <VSCodeProgressRing style={{height: "1rem"}} className={styles.midControl} />}
            {isLoadedRepoData &&
            <>
                {loadedRepoData &&
                <>
                    <VSCodeTextField
                        id="repository"
                        className={styles.midControl}
                        value={fullRepoName}
                        readOnly={true}
                    />
                </>}
                {loadedRepoData === null &&
                <>
                    <span className={styles.midControl}>Not configured</span>
                </>}
                <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetRepositoryDialogShown(true)} className={styles.sideControl}>
                    {loadedRepoData ? "Change" : "Configure"}
                </VSCodeButton>
            </>}
        </div>

        {props.resourcesState.selectedSubscription && (
            <RepositoryDialog
                isShown={props.resourcesState.isRepositoryDialogShown}
                subscription={props.resourcesState.selectedSubscription}
                referenceData={props.referenceData}
                eventHandlers={props.eventHandlers}
            />
        )}
    </>
    );
}

function getFullRepositoryName(acrName: AcrName, repositoryName: RepositoryName): string {
    return `${acrName}.azurecr.io/${repositoryName}`;
}

function getRepositoryKey(props: AzureResourcesProps): RepositoryKey | null {
    if (props.resourcesState.selectedSubscription === null || props.resourcesState.repositoryDefinition === null) {
        return null;
    }

    const subscriptionId = props.resourcesState.selectedSubscription.id;
    const {resourceGroup, acrName, repositoryName} = props.resourcesState.repositoryDefinition;
    return {subscriptionId, resourceGroup, acrName, repositoryName};
}