import { Client } from "@microsoft/microsoft-graph-client";
import { Errorable, getErrorMessage } from "./errorable";

const federatedIdentityCredentialIssuer = "https://token.actions.githubusercontent.com";
const federatedIdentityCredentialAudience = "api://AzureADTokenExchange";

type GraphListResult<T> = {
    value: T[];
};

export type ApplicationParams = {
    displayName: string;
};

export type Application = ApplicationParams & {
    appId: string;
    id: string;
};

export type ServicePrincipalParams = {
    appId: string;
    displayName?: string;
};

export type ServicePrincipal = ServicePrincipalParams & {
    id: string;
    displayName: string;
};

export type FederatedIdentityCredentialParams = {
    name: string;
    subject: string;
    issuer: string;
    description: string;
    audiences: string[];
};

export type FederatedIdentityCredential = FederatedIdentityCredentialParams & {
    id: string;
};

export async function getCurrentUserId(graphClient: Client): Promise<Errorable<string>> {
    try {
        const me = await graphClient.api("/me").get();
        return { succeeded: true, result: me.id };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function getOwnedApplications(graphClient: Client): Promise<Errorable<Application[]>> {
    try {
        const appSearchResults: GraphListResult<Application> = await graphClient
            .api("/me/ownedObjects/microsoft.graph.application")
            .select(["id", "appId", "displayName"])
            .get();

        return { succeeded: true, result: appSearchResults.value };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function createApplication(
    graphClient: Client,
    applicationName: string,
    ownerId: string,
): Promise<Errorable<Application>> {
    const newApp: ApplicationParams = {
        displayName: applicationName,
    };

    try {
        const application: Application = await graphClient.api("/applications").post(newApp);

        // Set ownership to the specified user
        // https://learn.microsoft.com/en-us/graph/api/application-post-owners?view=graph-rest-1.0&tabs=http#example
        await graphClient
            .api(`/applications/${application.id}/owners/$ref`)
            .post({ "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${ownerId}` });

        return { succeeded: true, result: application };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function createServicePrincipal(
    graphClient: Client,
    applicationId: string,
): Promise<Errorable<ServicePrincipal>> {
    const newServicePrincipal: ServicePrincipalParams = {
        appId: applicationId,
    };

    try {
        const servicePrincipal: ServicePrincipal = await graphClient
            .api("/servicePrincipals")
            .post(newServicePrincipal);
        return { succeeded: true, result: servicePrincipal };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function getServicePrincipalsForApp(
    graphClient: Client,
    appId: string,
): Promise<Errorable<ServicePrincipal[]>> {
    try {
        const spSearchResults: GraphListResult<ServicePrincipal> = await graphClient
            .api("/servicePrincipals")
            .filter(`appId eq '${appId}'`)
            .get();

        return { succeeded: true, result: spSearchResults.value };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function getFederatedIdentityCredentials(
    graphClient: Client,
    applicationId: string,
): Promise<Errorable<FederatedIdentityCredential[]>> {
    try {
        const identityResults: GraphListResult<FederatedIdentityCredential> = await graphClient
            .api(`/applications/${applicationId}/federatedIdentityCredentials`)
            .get();

        return { succeeded: true, result: identityResults.value };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export async function createFederatedIdentityCredential(
    graphClient: Client,
    applicationId: string,
    subject: string,
    name: string,
    description: string,
): Promise<Errorable<FederatedIdentityCredential>> {
    const newCred: FederatedIdentityCredentialParams = {
        name,
        subject,
        issuer: federatedIdentityCredentialIssuer,
        description,
        audiences: [federatedIdentityCredentialAudience],
    };

    try {
        const cred: FederatedIdentityCredential = await graphClient
            .api(`/applications/${applicationId}/federatedIdentityCredentials`)
            .post(newCred);

        return { succeeded: true, result: cred };
    } catch (e) {
        return { succeeded: false, error: getErrorMessage(e) };
    }
}

export function findFederatedIdentityCredential(
    subject: string,
    creds: FederatedIdentityCredential[],
): FederatedIdentityCredential | undefined {
    return creds.find((c) => c.subject === subject && c.issuer === federatedIdentityCredentialIssuer);
}
