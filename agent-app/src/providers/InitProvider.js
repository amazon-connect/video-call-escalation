import React, { useContext, useState, createContext } from 'react';
import { putConnectUserCache as putConnectUserCacheAPI, setConnectUserId as setConnectUserIdAPI } from '../apis/connectAPI';
import { useAppState } from './AppStateProvider';
import { Auth } from '@aws-amplify/auth';

const InitContext = createContext(null);

export function useInitProvider() {
    const state = useContext(InitContext);

    if (!state) {
        throw new Error('useInitProvider must be used within InitProvider');
    }

    return state;
}

export function InitProvider({ children }) {

    const [initCompleted, setInitCompleted] = useState(false);

    const { setConnectUserId: appSetConnectUserId, connectLoginByEmail: appConnectLoginByEmail } = useAppState();

    const init = async (connectUserId) => {
        if (connectUserId) {
            await putConnectUserCacheAPI();
            setInitCompleted(true);
        }
        else {
            setInitCompleted(false);
        }
    }

    const initConnectUser = async () => {
        console.info(`[VideoCallEscalation] > InitProvider > ConnectUserId not set`);

        const setConnectUserIdResult = await setConnectUserId(appConnectLoginByEmail);

        await refreshCurrentSession();
        appSetConnectUserId(setConnectUserIdResult.connectUserId);
        setTimeout(() => {
            location.reload();
        }, 1000);
    }

    const refreshCurrentSession = () => {
        return new Promise((resolve, reject) => {
            Auth.currentAuthenticatedUser().then((currentUser) => {
                const currentSession = currentUser.signInUserSession;
                currentUser.refreshSession(currentSession.refreshToken, (error, data) => {
                    if (error) {
                        console.error(`[VideoCallEscalation]  > InitProvider >  refreshSession: `, error);
                        Auth.signOut();
                    }
                    else {
                        console.log(`[VideoCallEscalation]  > InitProvider >  current session refreshed`);
                        currentUser.clearCachedUserData();
                        console.log(`[VideoCallEscalation]  > InitProvider > cachedUserData cleared`);
                        resolve();
                    }
                })
            }).catch(error => {
                console.error(`[VideoCallEscalation] currentAuthenticatedUser: `, error);
                Auth.signOut();
            });
        });
    }

    const setConnectUserId = async (connectLoginByEmail) => {
        const connect = window.connect;
        const connectAgent = new connect.Agent();

        const agentRoutingProfile = connectAgent.getRoutingProfile();
        const agentPersonalQueue = agentRoutingProfile.queues.find((queue) => queue.queueARN.includes('/queue/agent/'));
        const connectUserId = agentPersonalQueue?.queueARN.split('/').pop();
        console.info(`[VideoCallEscalation] AmazonConnectProvider >> extracted connectUserId: ${connectUserId}`);
        const setConnectUserIdAPIResult = await setConnectUserIdAPI(connectLoginByEmail, connectUserId);
        console.info(`[VideoCallEscalation] AmazonConnectProvider >> setConnectUserId successful`);
        return setConnectUserIdAPIResult;
    }

    const providerValue = {
        initCompleted,
        init,
        initConnectUser
    }

    return (
        <InitContext.Provider value={providerValue}>
            {children}
        </InitContext.Provider>
    );
}