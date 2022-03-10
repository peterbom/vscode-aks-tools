import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { IActionContext } from 'vscode-azureextensionui';
import { getAksClusterTreeItem } from '../utils/clusters';

export async function browsePipeline(context: IActionContext, target: any): Promise<void> {
    const deploymentCenterUrl = await getDeploymentCenterUrl(target);
    if (deploymentCenterUrl) {
        await vscode.env.openExternal(vscode.Uri.parse(deploymentCenterUrl));
    } else {
        vscode.window.showErrorMessage(`Unable to browse pipelines for the resource. Select appropriate cluster.`);
    }
}

async function getDeploymentCenterUrl(target: any): Promise<string | undefined> {
    const cloudExplorer = await k8s.extension.cloudExplorer.v1;
    const cluster = getAksClusterTreeItem(target, cloudExplorer);
    if (cluster === undefined) {
        return undefined;
    }

    return `https://portal.azure.com/#@${cluster.session.tenantId}/resource${cluster.armId}/deloymentCenter`;
}