import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';
import { registerSessionExpiredHandler } from '../lib/authSession';
import { queryClient } from '../lib/queryClient';
import { secureStorage, SessionKind } from '../lib/secureStore';
import { API_GLOBAL_PATHS } from '../lib/apiGlobalPaths';
import { getApiErrorMessage } from '../lib/apiErrors';
import { toOptionalPhoneE164, isValidE164 } from '../lib/phoneE164';
import { unregisterCurrentDeviceFromPush } from '../lib/notifications/pushNotifications';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'client' | 'brokerage' | 'admin';
  phone?: string;
  profileImageUrl?: string;
}

export interface ApiError {
  status: number;
  detail: string;
  errorType?: string;
}

function throwApiError(err: unknown): never | void {
  if (err !== null && typeof err === 'object' && 'response' in err) {
    const response = (err as {
      response?: { status?: number; data?: { detail?: string; errorType?: string } };
    }).response;
    if (response?.status) {
      const apiError: ApiError = {
        status: response.status,
        detail: response.data?.detail ?? 'An unexpected error occurred.',
        errorType: response.data?.errorType,
      };
      throw apiError;
    }
  }
}

export type RegisterOutcome = 'client' | 'agent';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True immediately after a successful verifyPortalLogin, cleared by RootNavigator after redirect. */
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  /** Request OTP to email or E.164 phone (portal unified login). */
  sendPortalOtp: (identifier: string) => Promise<void>;
  /** Verify OTP and establish session (same paths as before for /me). Returns the resolved User. */
  verifyPortalLogin: (identifier: string, code: string) => Promise<User>;
  register: (data: RegisterData) => Promise<RegisterOutcome>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'client';
  phone?: string;
  /** Required for EstateFlow client registration */
  agentReferralCode?: string;
  /** Agent self-signup (EstateFlow brokerage-agent service) */
  brokerageInviteCode?: string;
  /** ISO date YYYY-MM-DD (past), required for agent registration */
  dateOfBirth?: string;
  clientType?: string;
}

interface PortalLoginResponse {
  principalType: string;
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresInSeconds?: number;
  refreshExpiresInSeconds?: number;
  brokerageInviteCode?: string | null;
  brokerageName?: string | null;
  brokerTenantId?: string | null;
}

// Shared branding shape (same structure for both agent and client sessions)
interface Branding {
  theme?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  emailFooter?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  showBrokerName?: boolean | null;
  showAgentName?: boolean | null;
  useOwnBranding?: boolean | null;
  agentName?: string | null;
  agentEmail?: string | null;
  brokerageName?: string | null;
}

// 1. Extend ClientMeResponse to include the fields you need
interface ClientMeResponse {
  clientProfileId: number;
  brokerId?: string | null;
  authMethod?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneE164?: string | null;
  profileImageUrl?: string | null;
  clientType?: string | null;
  hasAllPreferences?: boolean;
  addresses?: unknown[];
  agentDetails?: {
    id: number;
    displayName?: string | null;
    referralCode?: string | null;
    phoneE164?: string | null;
    profileImageUrl?: string | null;
    email?: string | null;
    bio?: string | null;
    hasSharedStats?: boolean;
    sharedMedia?: {
      hasSharedMedia?: boolean;
      sharedMediaPropertyIds?: number[];
    } | null;
  } | null;
  branding?: Branding | null;
}

// 2. Extend the User interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'client' | 'brokerage' | 'admin';
  phone?: string;
  profileImageUrl?: string;
  clientType?: string;
  brokerId?: string;

  hasAllPreferences?: boolean;
  hasWorkAddress?: boolean;
  agentDetails?: {
    id: number;
    displayName?: string | null;
    referralCode?: string | null;
    phoneE164?: string | null;
    profileImageUrl?: string | null;
    email?: string | null;
    bio?: string | null;
    hasSharedStats?: boolean;
    sharedMedia?: {
      hasSharedMedia?: boolean;
      sharedMediaPropertyIds?: number[];
    } | null;
  } | null;
  brokerDisplayName?: string;
  brokerLogoUrl?: string;
  branding?: Branding | null;
}

interface AgentAddress {
  addressType: string;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

interface AgentMeResponse {
  agentId: number;
  brokerId?: string | null;
  brokerDisplayName?: string | null;
  authMethod?: string | null;
  email?: string | null;
  displayName?: string | null;
  phoneE164?: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  referralCode?: string | null;
  addresses?: AgentAddress[] | null;
  branding?: Branding | null;
}

interface BrokerMeResponse {
  platformUserId: string;
  brokerTenantId?: string | null;
  authMethod?: string | null;
  email?: string | null;
  displayName?: string | null;
  phoneE164?: string | null;
}

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = displayName?.trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function principalToSessionKind(p: string): SessionKind {
  switch (p) {
    case 'BROKER_OWNER':
    case 'BROKER':
      return 'broker_owner';
    case 'AGENT':
      return 'agent';
    case 'CLIENT':
      return 'client';
    default:
      throw new Error(`Unknown principalType: ${p}`);
  }
}

function titleCase(value: string): string {
  return `${value.at(0)?.toUpperCase() ?? ''}${value.slice(1).toLowerCase()}`;
}

function deriveNameFromIdentifier(identifier: string, fallback: string): { firstName: string; lastName: string } {
  const trimmed = identifier.trim();
  if (!trimmed.includes('@')) {
    return { firstName: fallback, lastName: '' };
  }
  const localPart = trimmed.split('@')[0] ?? '';
  const words = localPart
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(titleCase);
  if (words.length === 0) {
    return { firstName: fallback, lastName: '' };
  }
  return {
    firstName: words[0],
    lastName: words.slice(1).join(' '),
  };
}



function mapClientMeToUser(
  me: ClientMeResponse,
  sessionIdentifier: string,
  firstName: string,
  lastName: string
): User {
  const derived = deriveNameFromIdentifier(sessionIdentifier, 'Client');
  const fn = me.firstName?.trim() || firstName || derived.firstName;
  const ln = me.lastName?.trim() || lastName || derived.lastName;
  const email =
    (me.email && me.email.trim()) || (sessionIdentifier.includes('@') ? sessionIdentifier : 'client@session');
  const phone =
    me.phoneE164?.trim() || (sessionIdentifier.startsWith('+') ? sessionIdentifier : undefined);

  return {
    id: String(me.clientProfileId),
    email,
    firstName: fn || 'Client',
    lastName: ln,
    role: 'client',
    phone,
    profileImageUrl: me.profileImageUrl?.trim() || undefined,
    clientType: me.clientType ?? undefined,
    brokerId: me.brokerId ?? undefined,
    hasAllPreferences: me.hasAllPreferences,
    agentDetails: me.agentDetails
      ? {
          ...me.agentDetails,
          hasSharedStats: me.agentDetails.hasSharedStats ?? false,
          sharedMedia: me.agentDetails.sharedMedia ?? null,
        }
      : null,
    branding: me.branding ?? null,
  };
}





function mapAgentMeToUser(me: AgentMeResponse, sessionIdentifier: string): User {
  const derived = deriveNameFromIdentifier(sessionIdentifier, 'Agent');
  const fromDisplay = splitDisplayName(me.displayName);
  const workAddress = me.addresses?.find((a) => a.addressType === 'WORK');
  const hasWorkAddress = !!(workAddress?.line1?.trim());
  return {
    id: String(me.agentId),
    email: (me.email && me.email.trim()) || (sessionIdentifier.includes('@') ? sessionIdentifier : 'agent@session'),
    firstName: fromDisplay.firstName || derived.firstName || 'Agent',
    lastName: fromDisplay.lastName || derived.lastName,
    role: 'agent',
    phone: me.phoneE164?.trim() || (sessionIdentifier.startsWith('+') ? sessionIdentifier : undefined),
    profileImageUrl: me.profileImageUrl?.trim() || undefined,
    hasWorkAddress,
    brokerDisplayName: me.brokerDisplayName?.trim() || undefined,
    brokerLogoUrl: me.branding?.logoUrl?.trim() || undefined,
    branding: me.branding ?? null,
  };
}

function mapBrokerMeToUser(me: BrokerMeResponse, sessionIdentifier: string): User {
  const derived = deriveNameFromIdentifier(sessionIdentifier, 'Broker');
  const brokerageName = me.displayName?.trim() || '';
  const email =
    (me.email && me.email.trim()) ||
    (sessionIdentifier.includes('@') ? sessionIdentifier : 'broker@session');
  const phone = me.phoneE164?.trim() || (sessionIdentifier.startsWith('+') ? sessionIdentifier : undefined);
  return {
    id: me.platformUserId || 'broker@session',
    email,
    firstName: brokerageName || derived.firstName || 'Brokerage',
    lastName: '',
    role: 'brokerage',
    phone,
  };
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ✅ NEW: tracks whether the user just completed a fresh login (not a session restore)
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const logout = useCallback(async () => {
    await unregisterCurrentDeviceFromPush();
    await secureStorage.clearSession();
    setUser(null);
    setJustLoggedIn(false);
    queryClient.clear();
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      void logout();
    });
    return () => registerSessionExpiredHandler(null);
  }, [logout]);

  const clearJustLoggedIn = useCallback(() => {
    setJustLoggedIn(false);
  }, []);

  const applyClientSession = useCallback(
    async (sessionIdentifier: string, firstName: string, lastName: string): Promise<User> => {
      const me = await api.get<ClientMeResponse>(`${API_GLOBAL_PATHS.clientSession}/me`);
      const mappedUser = mapClientMeToUser(me.data, sessionIdentifier, firstName, lastName);
      setUser(mappedUser);
      return mappedUser;
    },
    []
  );

  const applyAgentSession = useCallback(async (sessionIdentifier: string): Promise<User> => {
    const me = await api.get<AgentMeResponse>(`${API_GLOBAL_PATHS.agentSession}/me`);
    const mappedUser = mapAgentMeToUser(me.data, sessionIdentifier);
    setUser(mappedUser);
    return mappedUser;
  }, []);

  const applyBrokerSession = useCallback(async (sessionIdentifier: string): Promise<User> => {
    const me = await api.get<BrokerMeResponse>(`${API_GLOBAL_PATHS.brokerSession}/me`);
    const mappedUser = mapBrokerMeToUser(me.data, sessionIdentifier);
    setUser(mappedUser);
    return mappedUser;
  }, []);

  const checkAuth = async () => {
    try {
      const token = await secureStorage.getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const sessionIdentifier = (await secureStorage.getSessionEmail()) ?? '';
      const kind = await secureStorage.getSessionKind();
      if (kind === 'agent') {
        await applyAgentSession(sessionIdentifier);
      } else if (kind === 'broker_owner') {
        await applyBrokerSession(sessionIdentifier);
      } else {
        await applyClientSession(sessionIdentifier, '', '');
      }
      // Note: justLoggedIn is intentionally NOT set here — this is a session restore, not a fresh login
    } catch (error) {
      console.log('Auth check failed:', error);
      await secureStorage.clearSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const sendPortalOtp = async (identifier: string) => {
    const trimmed = identifier.trim();
    await api.post(`${API_GLOBAL_PATHS.portalPublicSession}/otp/send`, { identifier: trimmed });
  };

  const verifyPortalLogin = async (identifier: string, code: string): Promise<User> => {
    const trimmed = identifier.trim();
    const res = await api.post<PortalLoginResponse>(
      `${API_GLOBAL_PATHS.portalPublicSession}/otp/verify`,
      { identifier: trimmed, code: code.trim(), agentReferralCode: null }
    );
    const body = res.data;
    if (!body?.accessToken) {
      throw new Error('Invalid login response: missing accessToken');
    }
    if (!body?.refreshToken) {
      throw new Error('Invalid login response: missing refreshToken');
    }
    const kind = principalToSessionKind(body.principalType);
    await secureStorage.setToken(body.accessToken);
    await secureStorage.setRefreshToken(body.refreshToken);
    if (body.expiresInSeconds) {
      const expiresAtMs = Date.now() + body.expiresInSeconds * 1000;
      await secureStorage.setTokenExpiresAt(expiresAtMs);
    }
    if (body.refreshExpiresInSeconds) {
      const expiresAtMs = Date.now() + body.refreshExpiresInSeconds * 1000;
      await secureStorage.setRefreshTokenExpiresAt(expiresAtMs);
    }
    await secureStorage.setSessionEmail(trimmed);
    await secureStorage.setSessionKind(kind);
    let resolvedUser: User;
    if (kind === 'client') {
      resolvedUser = await applyClientSession(trimmed, '', '');
    } else if (kind === 'agent') {
      resolvedUser = await applyAgentSession(trimmed);
    } else {
      resolvedUser = await applyBrokerSession(trimmed);
    }
    // ✅ Mark fresh login AFTER user state is set so RootNavigator can redirect
    setJustLoggedIn(true);
    return resolvedUser;
  };

  const register = async (data: RegisterData): Promise<RegisterOutcome> => {
    if (data.role === 'client') {
      const ref = data.agentReferralCode?.trim();
      if (!ref) {
        throw new Error('Agent referral code is required for client registration (EstateFlow).');
      }
      const phoneE164 = toOptionalPhoneE164(data.phone || '');
      await api
        .post(`${API_GLOBAL_PATHS.clientPublicClients}/register`, {
          brokerId: null,
          agentReferralCode: ref,
          email: data.email.trim(),
          firstName: data.firstName.trim() || null,
          lastName: data.lastName.trim() || null,
          phoneE164,
          profileImageUrl: null,
          clientType: data.clientType || null,
          driveFolderUrl: null,
        })
        .catch((err: unknown) => {
          throwApiError(err);
          throw err;
        });
      return 'client';
    }

    const invite = data.brokerageInviteCode?.trim();
    if (!invite) {
      throw new Error('Brokerage invite code is required for agent registration (EstateFlow).');
    }
    const mobile = data.phone?.trim() || '';
    if (!isValidE164(mobile)) {
      throw new Error('Mobile must be in E.164 format, e.g. +15551234567');
    }
    const dob = data.dateOfBirth?.trim();
    if (!dob) {
      throw new Error('Date of birth (YYYY-MM-DD) is required for agent registration.');
    }
    const displayName =
      `${data.firstName.trim()} ${data.lastName.trim()}`.trim() || data.email.trim();
    await api
      .post(`${API_GLOBAL_PATHS.agentPublicAgents}/register`, {
        brokerageInviteCode: invite,
        displayName,
        email: data.email.trim(),
        mobile,
        dateOfBirth: dob,
      })
      .catch((err: unknown) => {
        throwApiError(err);
        throw err;
      });
    return 'agent';
  };

  const refreshUser = useCallback(async () => {
    try {
      const token = await secureStorage.getToken();
      if (!token) {
        await logout();
        return;
      }
      const sessionIdentifier = (await secureStorage.getSessionEmail()) ?? '';
      const kind = await secureStorage.getSessionKind();
      if (kind === 'agent') {
        await applyAgentSession(sessionIdentifier);
      } else if (kind === 'broker_owner') {
        await applyBrokerSession(sessionIdentifier);
      } else {
        await applyClientSession(sessionIdentifier, '', '');
      }
    } catch (error) {
      console.log('User refresh failed:', error);
      await logout();
    }
  }, [applyAgentSession, applyBrokerSession, applyClientSession, logout]);

  const authValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      justLoggedIn,
      clearJustLoggedIn,
      sendPortalOtp,
      verifyPortalLogin,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, justLoggedIn, clearJustLoggedIn]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Something went wrong');
}
