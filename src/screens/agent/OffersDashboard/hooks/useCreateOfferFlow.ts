import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  OfferClient,
  CreateOfferFormState,
  CreateOfferStep,
  CreateOfferAmountErrors,
} from '../types/createOffer.types';
import { fetchOfferClients } from '../services/createOffer.service';
import { validateOfferAmount, hasErrors } from '../utils/createOffer.utils';
import {
  createOffer,
  invalidateOfferCaches,
  fetchClientHistory,
  type ClientHistoryProperty,
} from '../../../../lib/offersApi';
import type { AgentOffer } from '../../../../lib/offersApi';

const INITIAL: CreateOfferFormState = {
  selectedClient:   null,
  selectedProperty: null,
  amount:           '',
  notes:            '',
};

// ─── Prefill options ──────────────────────────────────────────────────────────

export interface UseCreateOfferFlowOptions {
  /** Pre-select a client by id (passed from TourDetailsScreen) */
  prefillClientId?:   string;
  /** Pre-select a property by id (passed from TourDetailsScreen) */
  prefillPropertyId?: string;
  /** Jump straight to a specific step — defaults to 1 */
  initialStep?:       number;
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseCreateOfferFlowReturn {
  // step
  currentStep:  CreateOfferStep;
  goNext:       () => void;
  goBack:       () => void;
  canProceed:   () => boolean;

  // step 1 — client
  clients:         OfferClient[];
  clientsLoading:  boolean;
  clientSearch:    string;
  setClientSearch: (s: string) => void;
  selectedClient:  OfferClient | null;
  selectClient:    (c: OfferClient) => void;

  // step 2 — property
  propertySearch:    string;
  setPropertySearch: (s: string) => void;
  selectedProperty:  ClientHistoryProperty | null;
  selectProperty:    (p: ClientHistoryProperty) => void;

  // step 3 — price & notes
  amount:       string;
  notes:        string;
  amountErrors: CreateOfferAmountErrors;
  setAmount:    (v: string) => void;
  setNotes:     (v: string) => void;

  // step 4 — submit
  isSubmitting: boolean;
  submitError:  string | null;
  handleSubmit: () => Promise<AgentOffer | null>;
  resetForm:    () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateOfferFlow(
  options: UseCreateOfferFlowOptions = {},
): UseCreateOfferFlowReturn {
  const {
    prefillClientId,
    prefillPropertyId,
    initialStep = 1,
  } = options;

  // ── Step — start at initialStep when provided (e.g. 3 from TourDetails) ──
  const [currentStep, setCurrentStep] = useState<CreateOfferStep>(
    (initialStep as CreateOfferStep) ?? 1,
  );

  const [form, setForm]                           = useState<CreateOfferFormState>(INITIAL);
  const [clientSearch, setClientSearch]           = useState('');
  const [propertySearch, setPropertySearch]       = useState('');
  const [amountErrors, setAmountErrors]           = useState<CreateOfferAmountErrors>({});
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [submitError, setSubmitError]             = useState<string | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: clients = [], isFetching: clientsLoading } = useQuery({
    queryKey: ['offer-clients'],
    queryFn:  () => fetchOfferClients(),
    staleTime: 60_000,
  });

  // ── Auto-select prefilled client once clients load ─────────────────────────
  useEffect(() => {
    if (!prefillClientId || clientsLoading || clients.length === 0) return;
    if (form.selectedClient !== null) return; // already set — don't override
    const match = clients.find((c) => String(c.id) === prefillClientId);
    if (match) {
      setForm((f) => ({ ...f, selectedClient: match, selectedProperty: null }));
    }
  }, [prefillClientId, clients, clientsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch client history for prefilled property selection only ─────────────
  useEffect(() => {
    if (!form.selectedClient || !prefillPropertyId || form.selectedProperty !== null) {
      return;
    }

    let cancelled = false;
    setPropertiesLoading(true);

    fetchClientHistory(form.selectedClient.id)
      .then((history) => {
        if (cancelled) return;

        const seen = new Set<number>();
        for (const tour of history.tours) {
          for (const prop of tour.properties) {
            if (seen.has(prop.id)) continue;
            seen.add(prop.id);
            if (String(prop.id) === prefillPropertyId) {
              setForm((f) => ({ ...f, selectedProperty: prop }));
              break;
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useCreateOfferFlow] fetchClientHistory failed:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
      });

    return () => { cancelled = true; };
  }, [form.selectedClient, form.selectedProperty, prefillPropertyId]);

  // ── Step validation ────────────────────────────────────────────────────────
  const canProceed = useCallback((): boolean => {
    if (currentStep === 1) return form.selectedClient !== null;
    if (currentStep === 2) return form.selectedProperty !== null;
    if (currentStep === 3) {
      const errs = validateOfferAmount(form.amount, form.notes);
      return !hasErrors(errs);
    }
    return true;
  }, [currentStep, form]);

  const goNext = useCallback(() => {
    if (currentStep === 3) {
      const errs = validateOfferAmount(form.amount, form.notes);
      setAmountErrors(errs);
      if (hasErrors(errs)) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 4) as CreateOfferStep);
  }, [currentStep, form.amount, form.notes]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1) as CreateOfferStep);
    setSubmitError(null);
  }, []);

  // ── Selectors ──────────────────────────────────────────────────────────────
  const selectClient = useCallback((c: OfferClient) => {
    // Clear previously selected property when client changes
    setForm((f) => ({ ...f, selectedClient: c, selectedProperty: null }));
  }, []);

  const selectProperty = useCallback((p: ClientHistoryProperty) => {
    setForm((f) => ({ ...f, selectedProperty: p }));
  }, []);

  const setAmount = useCallback((v: string) => {
    setForm((f) => ({ ...f, amount: v }));
    setAmountErrors((e) => ({ ...e, amount: undefined }));
  }, []);

  const setNotes = useCallback((v: string) => {
    setForm((f) => ({ ...f, notes: v }));
    setAmountErrors((e) => ({ ...e, notes: undefined }));
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (): Promise<AgentOffer | null> => {
    if (!form.selectedClient || !form.selectedProperty) return null;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOffer({
        masterPropertyId: form.selectedProperty.id,
        clientProfileId:  Number(form.selectedClient.id),
        amount:           Number(form.amount.trim()),
        notes:            form.notes.trim() || null,
      });
      invalidateOfferCaches();
      return result;
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unexpected error. Please retry.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  // ── Reset — always goes back to step 1 regardless of initialStep ───────────
  const resetForm = useCallback(() => {
    setForm(INITIAL);
    setCurrentStep(1);
    setClientSearch('');
    setPropertySearch('');
    setAmountErrors({});
    setSubmitError(null);
  }, []);

  return {
    currentStep, goNext, goBack, canProceed,
    clients, clientsLoading, clientSearch, setClientSearch,
    selectedClient: form.selectedClient, selectClient,
    propertySearch, setPropertySearch,
    selectedProperty: form.selectedProperty, selectProperty,
    amount: form.amount, notes: form.notes, amountErrors, setAmount, setNotes,
    isSubmitting, submitError, handleSubmit, resetForm,
  };
}













// import { useState, useCallback, useEffect } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import type {
//   OfferClient,
//   CreateOfferFormState,
//   CreateOfferStep,
//   CreateOfferAmountErrors,
// } from '../types/createOffer.types';
// import { fetchOfferClients } from '../services/createOffer.service';
// import { validateOfferAmount, hasErrors } from '../utils/createOffer.utils';
// import {
//   createOffer,
//   invalidateOfferCaches,
//   fetchClientHistory,
//   type ClientHistoryProperty,
// } from '../../../../lib/offersApi';
// import type { AgentOffer } from '../../../../lib/offersApi';

// const INITIAL: CreateOfferFormState = {
//   selectedClient:   null,
//   selectedProperty: null,
//   amount:           '',
//   notes:            '',
// };

// export interface UseCreateOfferFlowReturn {
//   // step
//   currentStep:  CreateOfferStep;
//   goNext:       () => void;
//   goBack:       () => void;
//   canProceed:   () => boolean;

//   // step 1 — client
//   clients:         OfferClient[];
//   clientsLoading:  boolean;
//   clientSearch:    string;
//   setClientSearch: (s: string) => void;
//   selectedClient:  OfferClient | null;
//   selectClient:    (c: OfferClient) => void;

//   // step 2 — property
//   properties:        ClientHistoryProperty[];
//   propertiesLoading: boolean;
//   propertySearch:    string;
//   setPropertySearch: (s: string) => void;
//   selectedProperty:  ClientHistoryProperty | null;
//   selectProperty:    (p: ClientHistoryProperty) => void;

//   // step 3 — price & notes
//   amount:       string;
//   notes:        string;
//   amountErrors: CreateOfferAmountErrors;
//   setAmount:    (v: string) => void;
//   setNotes:     (v: string) => void;

//   // step 4 — submit
//   isSubmitting: boolean;
//   submitError:  string | null;
//   handleSubmit: () => Promise<AgentOffer | null>;
//   resetForm:    () => void;
// }

// export function useCreateOfferFlow(): UseCreateOfferFlowReturn {
//   const [currentStep, setCurrentStep] = useState<CreateOfferStep>(1);
//   const [form, setForm] = useState<CreateOfferFormState>(INITIAL);
//   const [clientSearch, setClientSearch]     = useState('');
//   const [propertySearch, setPropertySearch] = useState('');
//   const [amountErrors, setAmountErrors]     = useState<CreateOfferAmountErrors>({});
//   const [isSubmitting, setIsSubmitting]     = useState(false);
//   const [submitError, setSubmitError]       = useState<string | null>(null);

//   // step 2 — client properties fetched from history
//   const [properties, setProperties]               = useState<ClientHistoryProperty[]>([]);
//   const [propertiesLoading, setPropertiesLoading] = useState(false);

//   // ── Queries ────────────────────────────────────────────────────────────
//   const { data: clients = [], isFetching: clientsLoading } = useQuery({
//     queryKey: ['offer-clients'],
//     queryFn:  () => fetchOfferClients(),
//     staleTime: 60_000,
//   });

//   // ── Fetch client properties whenever selected client changes ───────────
//   useEffect(() => {
//     if (!form.selectedClient) {
//       setProperties([]);
//       return;
//     }

//     let cancelled = false;
//     setPropertiesLoading(true);

//     fetchClientHistory(form.selectedClient.id)
//       .then((history) => {
//         if (cancelled) return;

//         // Flatten tours → properties, deduplicate by property id
//         const seen = new Set<number>();
//         const unique: ClientHistoryProperty[] = [];
//         for (const tour of history.tours) {
//           for (const prop of tour.properties) {
//             if (!seen.has(prop.id)) {
//               seen.add(prop.id);
//               unique.push(prop);
//             }
//           }
//         }

//         setProperties(unique);
//       })
//       .catch((err) => {
//         if (!cancelled) {
//           console.error('[useCreateOfferFlow] fetchClientHistory failed:', err);
//           setProperties([]);
//         }
//       })
//       .finally(() => {
//         if (!cancelled) setPropertiesLoading(false);
//       });

//     return () => { cancelled = true; };
//   }, [form.selectedClient]);

//   // ── Step validation ────────────────────────────────────────────────────
//   const canProceed = useCallback((): boolean => {
//     if (currentStep === 1) return form.selectedClient !== null;
//     if (currentStep === 2) return form.selectedProperty !== null;
//     if (currentStep === 3) {
//       const errs = validateOfferAmount(form.amount, form.notes);
//       return !hasErrors(errs);
//     }
//     return true;
//   }, [currentStep, form]);

//   const goNext = useCallback(() => {
//     if (currentStep === 3) {
//       const errs = validateOfferAmount(form.amount, form.notes);
//       setAmountErrors(errs);
//       if (hasErrors(errs)) return;
//     }
//     setCurrentStep((s) => Math.min(s + 1, 4) as CreateOfferStep);
//   }, [currentStep, form.amount, form.notes]);

//   const goBack = useCallback(() => {
//     setCurrentStep((s) => Math.max(s - 1, 1) as CreateOfferStep);
//     setSubmitError(null);
//   }, []);

//   // ── Selectors ──────────────────────────────────────────────────────────
//   const selectClient = useCallback((c: OfferClient) => {
//     // Clear previously selected property when client changes
//     setForm((f) => ({ ...f, selectedClient: c, selectedProperty: null }));
//   }, []);

//   const selectProperty = useCallback((p: ClientHistoryProperty) => {
//     setForm((f) => ({ ...f, selectedProperty: p }));
//   }, []);

//   const setAmount = useCallback((v: string) => {
//     setForm((f) => ({ ...f, amount: v }));
//     setAmountErrors((e) => ({ ...e, amount: undefined }));
//   }, []);

//   const setNotes = useCallback((v: string) => {
//     setForm((f) => ({ ...f, notes: v }));
//     setAmountErrors((e) => ({ ...e, notes: undefined }));
//   }, []);

//   // ── Submit ─────────────────────────────────────────────────────────────
//   const handleSubmit = useCallback(async (): Promise<AgentOffer | null> => {
//     if (!form.selectedClient || !form.selectedProperty) return null;
//     setIsSubmitting(true);
//     setSubmitError(null);
//     try {
//       const result = await createOffer({
//         masterPropertyId: form.selectedProperty.id,   // already a number
//         clientProfileId:  Number(form.selectedClient.id),
//         amount:           Number(form.amount.trim()),
//         notes:            form.notes.trim() || null,
//       });
//       invalidateOfferCaches();
//       return result;
//     } catch (err: unknown) {
//       setSubmitError(err instanceof Error ? err.message : 'Unexpected error. Please retry.');
//       return null;
//     } finally {
//       setIsSubmitting(false);
//     }
//   }, [form]);

//   const resetForm = useCallback(() => {
//     setForm(INITIAL);
//     setCurrentStep(1);
//     setClientSearch('');
//     setPropertySearch('');
//     setAmountErrors({});
//     setSubmitError(null);
//   }, []);

//   return {
//     currentStep, goNext, goBack, canProceed,
//     clients, clientsLoading, clientSearch, setClientSearch,
//     selectedClient: form.selectedClient, selectClient,
//     properties, propertiesLoading, propertySearch, setPropertySearch,
//     selectedProperty: form.selectedProperty, selectProperty,
//     amount: form.amount, notes: form.notes, amountErrors, setAmount, setNotes,
//     isSubmitting, submitError, handleSubmit, resetForm,
//   };
// }


