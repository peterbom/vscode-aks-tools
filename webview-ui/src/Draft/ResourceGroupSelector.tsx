import { FormEvent } from "react";
import { Lazy, isLoaded, isLoading } from "../utilities/lazy";
import { VSCodeDropdown, VSCodeOption, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";

export interface ResourceGroupSelectorProps {
    groups: Lazy<string[]>;
    selectedValue: string | null;
    id?: string;
    className?: React.HTMLAttributes<any>['className'];
    onSelect: (value: string | null) => void;
}

export function ResourceGroupSelector(props: ResourceGroupSelectorProps) {
    function handleChange(e: Event | FormEvent<HTMLElement>) {
        const elem = e.target as HTMLInputElement;
        const group = elem.value || null;
        props.onSelect(group);
    }

    return (
    <>
        {isLoading(props.groups) && <VSCodeProgressRing style={{height: "1rem"}} />}
        {isLoaded(props.groups) && (
            <VSCodeDropdown className={props.className} id={props.id} value={props.selectedValue || ""} onChange={handleChange}>
                <VSCodeOption value="">Select</VSCodeOption>
                {props.groups.value.map(g => (
                    <VSCodeOption key={g} value={g}>{g}</VSCodeOption>
                ))}
            </VSCodeDropdown>
        )}
    </>
    );
}