import { EventHandlers } from "../utilities/state";
import { AzureResourcesState, EventDef, ServicesState } from "./state";

export interface ServiceProps {
    azureResourceState: AzureResourcesState
    serviceState: ServicesState
    eventHandlers: EventHandlers<EventDef>
}

export function Service(props: ServiceProps) {
    return (
    <>
        <h3>{props.serviceState.name}</h3>
    </>
    );
}