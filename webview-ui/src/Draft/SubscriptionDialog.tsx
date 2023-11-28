import { FormEvent } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, map as lazyMap } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { Maybe, isNothing, just, nothing } from "../utilities/maybe";
import { DialogState } from "./state/dialogs";

export interface SubscriptionDialogProps {
    state: DialogState<"subscription">;
    subscriptionsData: Lazy<SubscriptionReferenceData[]>;
    eventHandlers: EventHandlers<EventDef>;
}

export function SubscriptionDialog(props: SubscriptionDialogProps) {
    function validate(): Maybe<Subscription> {
        if (!props.state.content.subscription) return nothing();

        return just(props.state.content.subscription);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const subscription = validate();
        if (isNothing(subscription)) {
            return;
        }

        props.eventHandlers.onSetDialogVisibility({ dialog: "subscription", shown: false });
        props.eventHandlers.onSetSubscription(subscription.value);
    }

    return (
        <Dialog
            isShown={props.state.shown}
            onCancel={() => props.eventHandlers.onSetDialogVisibility({ dialog: "subscription", shown: false })}
        >
            <h2>Choose Subscription</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <div className={`${styles.inputContainer} ${styles.dropdownContainer}`}>
                    <label htmlFor="subscription-input">Subscription</label>
                    <ResourceSelector<Subscription>
                        id="subscription-input"
                        className={styles.midControl}
                        resources={lazyMap(props.subscriptionsData, (subs) => subs.map((sub) => sub.subscription))}
                        selectedItem={props.state.content.subscription || null}
                        valueGetter={(s) => s.id}
                        labelGetter={(s) => s.name}
                        onSelect={(s) =>
                            props.eventHandlers.onSetDialogContent({
                                dialog: "subscription",
                                content: { ...props.state.content, subscription: s || undefined },
                            })
                        }
                    />
                </div>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={isNothing(validate())}>
                        Save
                    </VSCodeButton>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() =>
                            props.eventHandlers.onSetDialogVisibility({ dialog: "subscription", shown: false })
                        }
                    >
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}
