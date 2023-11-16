import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, map as lazyMap } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { Maybe, asNullable } from "../utilities/maybe";

export interface SubscriptionDialogProps {
    isShown: boolean;
    subscriptionsData: Lazy<SubscriptionReferenceData[]>;
    selectedSubscription: Maybe<Subscription>;
    eventHandlers: EventHandlers<EventDef>;
}

export function SubscriptionDialog(props: SubscriptionDialogProps) {
    const [subscription, setSubscription] = useState(asNullable(props.selectedSubscription));

    function canCreate() {
        // TODO:
        return subscription !== null;
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate()) {
            return;
        }

        props.eventHandlers.onSetSubscriptionDialogShown(false);
        props.eventHandlers.onSetSubscription(subscription);
    }

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetSubscriptionDialogShown(false)}>
            <h2>Choose Subscription</h2>
    
            <form onSubmit={handleSubmit}>
                <VSCodeDivider/>

                <div className={styles.inputContainer}>
                    <label htmlFor="subscription-input">Subscription</label>
                    <ResourceSelector<Subscription>
                        id="subscription-input"
                        className={styles.midControl}
                        resources={lazyMap(props.subscriptionsData, subs => subs.map(sub => sub.subscription))}
                        selectedItem={subscription}
                        valueGetter={s => s.id}
                        labelGetter={s => s.name}
                        onSelect={setSubscription}
                    />
                </div>
    
                <VSCodeDivider/>
    
                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={!canCreate()}>Save</VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetSubscriptionDialogShown(false)}>Cancel</VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}