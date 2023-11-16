import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, ClusterReferenceData, EventDef, RepositoryReferenceData, SubscriptionReferenceData } from "./state";
import { VSCodeButton, VSCodeProgressRing, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { RepositoryDialog } from "./RepositoryDialog";
import { ResourceSelector } from "../components/ResourceSelector";
import { Lazy, isLoaded, isLoading, map as lazyMap } from "../utilities/lazy";
import { Maybe, hasValue } from "../utilities/maybe";
import { ClusterDialog } from "./ClusterDialog";

export interface AzureResourcesProps {
    resourcesState: AzureResourcesState;
    subscriptionsData: Lazy<SubscriptionReferenceData[]>;
    subscriptionData: Lazy<Maybe<SubscriptionReferenceData>>;
    repositoryData: Lazy<Maybe<RepositoryReferenceData>>;
    clusterData: Lazy<Maybe<ClusterReferenceData>>;
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
                resources={lazyMap(props.subscriptionsData, subs => subs.map(s => s.subscription))}
                selectedItem={props.resourcesState.selectedSubscription}
                valueGetter={s => s.id}
                labelGetter={s => s.name}
                onSelect={props.eventHandlers.onSetSubscription}
            />

            <label htmlFor="repository" className={styles.label}>Repository</label>
            {isLoading(props.repositoryData) && <VSCodeProgressRing style={{height: "1rem"}} className={styles.midControl} />}
            {isLoaded(props.repositoryData) &&
            <>
                {hasValue(props.repositoryData.value) &&
                <VSCodeTextField
                    id="repository"
                    className={styles.midControl}
                    value={getFullRepositoryName(props.repositoryData.value.value)}
                    readOnly={true}
                />
                ||
                <span className={styles.midControl}>Not configured</span>
                }

                {isLoaded(props.subscriptionData) && hasValue(props.subscriptionData.value) &&
                <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetRepositoryDialogShown(true)} className={styles.sideControl}>
                    {hasValue(props.repositoryData.value) ? "Change" : "Configure"}
                </VSCodeButton>
                }
            </>}

            <label htmlFor="cluster" className={styles.label}>Cluster</label>
            {isLoading(props.clusterData) && <VSCodeProgressRing style={{height: "1rem"}} className={styles.midControl} />}
            {isLoaded(props.clusterData) &&
            <>
                {hasValue(props.clusterData.value) &&
                <VSCodeTextField
                    id="cluster"
                    className={styles.midControl}
                    value={props.clusterData.value.value.key.clusterName}
                    readOnly={true}
                />

                ||
                <span className={styles.midControl}>Not configured</span>
                }

                {isLoaded(props.subscriptionData) && hasValue(props.subscriptionData.value) &&
                <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetClusterDialogShown(true)} className={styles.sideControl}>
                    {hasValue(props.clusterData.value) ? "Change" : "Configure"}
                </VSCodeButton>
                }
            </>}
        </div>

        {isLoaded(props.subscriptionData) && hasValue(props.subscriptionData.value) && (
        <>
            <RepositoryDialog
                isShown={props.resourcesState.isRepositoryDialogShown}
                key={`repo-${props.resourcesState.isRepositoryDialogShown}` /* Reset state when shown/hidden */}
                repositoryDefinition={props.resourcesState.repositoryDefinition}
                subscriptionData={props.subscriptionData.value.value}
                eventHandlers={props.eventHandlers}
            />
            <ClusterDialog
                isShown={props.resourcesState.isClusterDialogShown}
                key={`cluster-${props.resourcesState.isClusterDialogShown}` /* Reset state when shown/hidden */}
                clusterDefinition={props.resourcesState.clusterDefinition}
                subscriptionData={props.subscriptionData.value.value}
                eventHandlers={props.eventHandlers}
            />
        </>
        )}
    </>
    );
}

function getFullRepositoryName(repoData: RepositoryReferenceData): string {
    return `${repoData.key.acrName}.azurecr.io/${repoData.key.repositoryName}`;
}