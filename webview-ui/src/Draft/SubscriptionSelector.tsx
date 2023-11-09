import { FormEvent } from "react";
import { Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";
import { Lazy, isLoaded, isLoading } from "../utilities/lazy";
import { VSCodeDropdown, VSCodeOption, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";

export interface SubscriptionSelectorProps {
    subscriptions: Lazy<Subscription[]>;
    selectedValue: Subscription | null;
    id?: string;
    className?: React.HTMLAttributes<any>['className'];
    onSelect: (value: Subscription | null) => void;
}

export function SubscriptionSelector(props: SubscriptionSelectorProps) {
    function handleChange(e: Event | FormEvent<HTMLElement>) {
        const elem = e.target as HTMLInputElement;
        const subscription = elem.value && isLoaded(props.subscriptions) ? props.subscriptions.value.find(s => s.id === elem.value) || null : null;
        props.onSelect(subscription);
    }

    return (
    <>
        {isLoading(props.subscriptions) && <VSCodeProgressRing style={{height: "1rem"}} />}
        {isLoaded(props.subscriptions) && (
            <VSCodeDropdown className={props.className} id={props.id} value={props.selectedValue?.id || ""} onChange={handleChange}>
                <VSCodeOption value="">Select</VSCodeOption>
                {props.subscriptions.value.map(sub => (
                    <VSCodeOption key={sub.id} value={sub.id}>{sub.name}</VSCodeOption>
                ))}
            </VSCodeDropdown>
        )}
    </>
    );
}