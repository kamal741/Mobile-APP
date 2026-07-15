import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Building2, ChevronRight, Home, Icon, Map, Search, X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import {
  useLocationSuggestions,
  type LocationSuggestionItem,
  type LocationSuggestionKind,
} from '@/lib/locationApi';

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;
const DROPDOWN_MAX_HEIGHT = 280;
const DROPDOWN_MIN_HEIGHT = 120;

/**
 * Three explicit states instead of a single `focused` boolean:
 *  - idle:     plain, non-editable box. No keyboard, no dropdown.
 *  - browsing: dropdown is open (top suggestions / search results), but the
 *              TextInput is still non-editable — no native keyboard focus is
 *              ever requested in this state, so there's nothing for Android
 *              to spuriously blur.
 *  - editing:  TextInput becomes editable and is explicitly focused, which
 *              opens the keyboard. The dropdown is already mounted and
 *              stable by this point, so the keyboard opening doesn't race
 *              against it appearing.
 *
 * Tap 1 (idle → browsing): opens the dropdown, no keyboard.
 * Tap 2 (browsing → editing): opens the keyboard, dropdown stays open.
 */
type Mode = 'idle' | 'browsing' | 'editing';

interface Props {
  kind:                  LocationSuggestionKind;
  values:                string[];
  onChange:              (values: string[]) => void;
  province?:             string;
  parentAreas?:          string[];
  parentMunicipalities?: string[];
  placeholder?:          string;
  hasError?:             boolean;
  /** Fired on the first tap (idle → browsing) so the parent screen can
   *  scroll this field into view before anything opens. */
  onFocusScrollRequest?: () => void;
}

const KIND_META: Record<
  LocationSuggestionKind,
  { label: string; Icon: typeof Map; empty: string }
> = {
  areas: {
    label: 'Areas',
    Icon: Map,
    empty: 'No areas match your search.',
  },
  municipalities: {
    label: 'Municipalities',
    Icon: Building2,
    empty: 'No municipalities match your search.',
  },
  communities: {
    label: 'Communities',
    Icon: Home,
    empty: 'No communities found for your selected locations.',
  },
};

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function suggestionSubtitle(
  item: LocationSuggestionItem,
  kind: LocationSuggestionKind,
): string | null {
  if (kind === 'areas') {
    if (item.city && item.city.toLowerCase() !== item.label.toLowerCase()) {
      return item.city;
    }
    return item.province;
  }
  if (kind === 'municipalities') {
    if (item.cityRegion && item.cityRegion.toLowerCase() !== item.label.toLowerCase()) {
      return item.cityRegion;
    }
    return item.province;
  }
  const parts = [item.city, item.cityRegion].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  const seen = new Set<string>();
  const unique = parts.filter(part => {
    const key = part.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.length > 0 ? unique.join(' · ') : item.province;
}

function formatListingCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return String(count);
}

export function LocationPickerInput({
  kind,
  values,
  onChange,
  province,
  parentAreas,
  parentMunicipalities,
  placeholder,
  hasError = false,
  onFocusScrollRequest,
}: Props) {
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [searchWrapY, setSearchWrapY] = useState(0);
  const [searchWrapHeight, setSearchWrapHeight] = useState(0);

  const dropdownInteractingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const searchWrapRef = useRef<View>(null);

  const { height: windowHeight } = useWindowDimensions();
  const debouncedQ = useDebouncedValue(draft.trim(), DEBOUNCE_MS);
  const meta = KIND_META[kind];

  const isOpen = mode !== 'idle';       // dropdown may show
  const isEditing = mode === 'editing'; // input is editable + keyboard is up

  // ── Keyboard height tracking — keeps the dropdown sized to the space above
  //    the keyboard so it's never rendered underneath it. ─────────────────────
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Focus the real input only once we've deliberately entered editing mode —
  // by then the dropdown (if any) is already mounted and settled.
  useEffect(() => {
    if (mode === 'editing') {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [mode]);

  const measureSearchWrap = useCallback(() => {
    searchWrapRef.current?.measureInWindow((_x, y, _w, h) => {
      setSearchWrapY(y);
      setSearchWrapHeight(h);
    });
  }, []);

  const queryParams = useMemo(() => {
    const params: {
      province?: string;
      area?: string[];
      municipality?: string[];
      q?: string;
      limit: number;
    } = { limit: 200 };

    if (province?.trim()) params.province = province.trim();
    if (kind === 'municipalities' && parentAreas?.length) {
      params.area = parentAreas;
    }
    if (kind === 'communities') {
      if (parentMunicipalities?.length) params.municipality = parentMunicipalities;
      if (parentAreas?.length) params.area = parentAreas;
    }
    if (debouncedQ.length >= MIN_SEARCH_LENGTH) params.q = debouncedQ;
    return params;
  }, [kind, province, parentAreas, parentMunicipalities, debouncedQ]);

  const needsMunicipality =
    kind === 'communities' && !(parentMunicipalities?.some(value => value.trim()) ?? false);
  const isEmptyBrowse = debouncedQ.length === 0;
  const hasSearchQuery = debouncedQ.length >= MIN_SEARCH_LENGTH;
  const queryEnabled =
    isOpen && !needsMunicipality && (isEmptyBrowse || hasSearchQuery);

  const { data, isFetching, isError } = useLocationSuggestions(kind, queryParams, {
    enabled: queryEnabled,
  });

  const suggestions = useMemo(() => {
    const seen = new Set(values.map(v => v.toLowerCase()));
    return (data?.items ?? []).filter(item => !seen.has(item.label.toLowerCase()));
  }, [data?.items, values]);

  const defaultPlaceholder =
    kind === 'areas'
      ? 'Search areas…'
      : kind === 'municipalities'
        ? 'Search municipalities…'
        : 'Search communities…';

  /**
   * Tap on the search box itself.
   *  idle     → browsing  (open dropdown, no keyboard)
   *  browsing → editing   (make it a real input, open keyboard)
   *  editing  → no-op here; the now-editable TextInput handles the tap.
   */
  function handleBoxPress() {
    if (needsMunicipality) return;
    if (mode === 'idle') {
      onFocusScrollRequest?.();
      setMode('browsing');
    } else if (mode === 'browsing') {
      onFocusScrollRequest?.();
      setMode('editing');
    }
  }

  function addLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (values.some(v => v.toLowerCase() === key)) return;
    onChange([...values, trimmed]);
    setDraft('');
    // Only keep the keyboard up if the user was actively typing/searching.
    // If they were just browsing top suggestions, stay in browsing mode so
    // the dropdown remains open without popping the keyboard.
    if (mode === 'editing') {
      inputRef.current?.focus();
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function closeDropdown() {
    setDraft('');
    setMode('idle');
    inputRef.current?.blur();
  }

  const showDropdown =
    isOpen &&
    !needsMunicipality &&
    (isEmptyBrowse || hasSearchQuery) &&
    (isFetching || suggestions.length > 0 || isError);

  const showMinLengthHint =
    isOpen && !needsMunicipality && draft.trim().length > 0 && draft.trim().length < MIN_SEARCH_LENGTH;

  const KindIcon = meta.Icon;

  // ── Cap the dropdown to the space above the keyboard so it's always fully
  //    visible instead of being partially hidden behind it. ──────────────────
  const dropdownAvailableHeight = Math.max(
    DROPDOWN_MIN_HEIGHT,
    windowHeight - keyboardHeight - (searchWrapY + searchWrapHeight) - 24,
  );
  const dynamicDropdownMaxHeight = Math.min(DROPDOWN_MAX_HEIGHT, dropdownAvailableHeight);

  return (
    <View style={styles.wrap}>
      <View
        ref={searchWrapRef}
        onLayout={measureSearchWrap}
        style={[
          styles.searchWrap,
          isOpen && !needsMunicipality && styles.searchWrapFocused,
          hasError && styles.searchWrapError,
          needsMunicipality && styles.searchWrapDisabled,
        ]}
      >
        <Search
          size={18}
          color={isOpen && !needsMunicipality ? Colors.primary : Colors.textMuted}
          strokeWidth={2.2}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={
            mode === 'browsing'
              ? 'Tap to type your own search…'
              : (placeholder ?? defaultPlaceholder)
          }
          placeholderTextColor={Colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          onBlur={() => {
            setTimeout(() => {
              if (dropdownInteractingRef.current) return;
              // Drop back to browsing (dropdown stays open) rather than
              // fully closing — closing entirely happens explicitly via the
              // ✕ button or by picking/leaving the field.
              setMode(prev => (prev === 'editing' ? 'browsing' : prev));
            }, 150);
          }}
          autoCapitalize="words"
          autoCorrect={false}
          editable={isEditing && !needsMunicipality}
          pointerEvents={isEditing ? 'auto' : 'none'}
        />
        {isFetching && isOpen && (
          <ActivityIndicator size="small" color={Colors.primary} />
        )}
        {isOpen && !needsMunicipality && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={closeDropdown}
          >
            <X size={16} color={Colors.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {/* Tap-catcher: active whenever the input itself isn't editable yet.
            Drives the idle → browsing → editing progression. Removed once
            editing so normal typing/caret placement works untouched. */}
        {!isEditing && !needsMunicipality && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleBoxPress}
          />
        )}
      </View>

      {needsMunicipality && (
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Select at least one municipality above to browse communities.
          </Text>
        </View>
      )}

      {!needsMunicipality && !showDropdown && (
        <Text style={styles.hint}>
          Tap to browse top {meta.label.toLowerCase()}, tap again to type and search.
        </Text>
      )}

      {showMinLengthHint && (
        <Text style={styles.hintAccent}>
          {MIN_SEARCH_LENGTH - draft.trim().length} more character
          {MIN_SEARCH_LENGTH - draft.trim().length === 1 ? '' : 's'} to search…
        </Text>
      )}

      {showDropdown && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <View style={styles.dropdownHeaderLeft}>
              <View style={styles.headerIconBadge}>
                <KindIcon size={14} color={Colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.dropdownHeaderTitle}>
                {isFetching && suggestions.length === 0 ? 'Searching' : meta.label}
              </Text>
            </View>
            {!isFetching && suggestions.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{suggestions.length}</Text>
              </View>
            )}
          </View>

          {isFetching && suggestions.length === 0 ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.stateText}>Finding matches…</Text>
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTextError}>Could not load suggestions.</Text>
              <Text style={styles.stateSubtext}>Check your connection and try again.</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.stateBox}>
              <KindIcon size={28} color={Colors.borderMid} strokeWidth={1.5} />
              <Text style={styles.stateText}>{meta.empty}</Text>
            </View>
          ) : (
            <ScrollView
              style={[styles.suggestionList, { maxHeight: dynamicDropdownMaxHeight }]}
              contentContainerStyle={styles.suggestionListContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="always"
              onTouchStart={() => {
                dropdownInteractingRef.current = true;
              }}
              onTouchEnd={() => {
                dropdownInteractingRef.current = false;
              }}
              onTouchCancel={() => {
                dropdownInteractingRef.current = false;
              }}
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((item, index) => {
                const subtitle = suggestionSubtitle(item, kind);
                const isLast = index === suggestions.length - 1;
                return (
                  <TouchableOpacity
                    key={`${item.type}-${item.label}-${index}`}
                    style={[styles.suggestionRow, !isLast && styles.suggestionRowBorder]}
                    onPress={() => {
                      dropdownInteractingRef.current = false;
                      addLabel(item.label);
                    }}
                    activeOpacity={0.65}
                  >
                    <View style={styles.suggestionIconBadge}>
                      <KindIcon size={16} color={Colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.suggestionBody}>
                      <Text style={styles.suggestionLabel} numberOfLines={2}>
                        {item.label}
                      </Text>
                      {subtitle ? (
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {item.listingCount > 0 && (
                      <View style={styles.listingPill}>
                        <Text style={styles.listingPillCount}>
                          {formatListingCount(item.listingCount)}
                        </Text>
                        <Text style={styles.listingPillLabel}>listings</Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {values.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Selected</Text>
          <View style={styles.chipsWrap}>
            {values.map((item, index) => (
              <TouchableOpacity
                key={`${item}-${index}`}
                style={styles.locationChip}
                onPress={() => removeAt(index)}
                activeOpacity={0.7}
              >
                <KindIcon size={13} color={Colors.primary} strokeWidth={2.2} />
                <Text style={styles.locationChipText} numberOfLines={1}>
                  {item}
                </Text>
                <Text style={styles.locationChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderMid,
    borderRadius: 12,
    backgroundColor: Colors.subtle,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  searchWrapError: {
    borderColor: '#FC8181',
  },
  searchWrapDisabled: {
    opacity: 0.55,
    backgroundColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  callout: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.primary,
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  hintAccent: {
    fontSize: 11,
    color: Colors.primary,
    lineHeight: 16,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  dropdown: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1a1f36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Colors.subtle,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSub,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  stateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  stateTextError: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C53030',
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  suggestionList: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  suggestionListContent: {
    flexGrow: 0,
    paddingVertical: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  suggestionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  suggestionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  suggestionLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  listingPill: {
    alignItems: 'center',
    backgroundColor: Colors.subtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 52,
    flexShrink: 0,
  },
  listingPillCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 14,
  },
  listingPillLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  selectedSection: {
    gap: 8,
    marginTop: 2,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  locationChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    maxWidth: 200,
  },
  locationChipRemove: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 18,
    marginLeft: 2,
  },
});









// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ActivityIndicator,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import { Building2, ChevronRight, Home, Map, Search } from 'lucide-react-native';
// import { Colors } from '../constants/theme';
// import {
//   useLocationSuggestions,
//   type LocationSuggestionItem,
//   type LocationSuggestionKind,
// } from '@/lib/locationApi';

// const DEBOUNCE_MS = 300;
// const MIN_SEARCH_LENGTH = 3;
// const DROPDOWN_MAX_HEIGHT = 280;

// interface Props {
//   kind:                  LocationSuggestionKind;
//   values:                string[];
//   onChange:              (values: string[]) => void;
//   province?:             string;
//   parentAreas?:          string[];
//   parentMunicipalities?: string[];
//   placeholder?:          string;
//   hasError?:             boolean;
// }

// const KIND_META: Record<
//   LocationSuggestionKind,
//   { label: string; Icon: typeof Map; empty: string }
// > = {
//   areas: {
//     label: 'Areas',
//     Icon: Map,
//     empty: 'No areas match your search.',
//   },
//   municipalities: {
//     label: 'Municipalities',
//     Icon: Building2,
//     empty: 'No municipalities match your search.',
//   },
//   communities: {
//     label: 'Communities',
//     Icon: Home,
//     empty: 'No communities found for your selected locations.',
//   },
// };

// function useDebouncedValue(value: string, delayMs: number): string {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const timer = setTimeout(() => setDebounced(value), delayMs);
//     return () => clearTimeout(timer);
//   }, [value, delayMs]);
//   return debounced;
// }

// function suggestionSubtitle(
//   item: LocationSuggestionItem,
//   kind: LocationSuggestionKind,
// ): string | null {
//   if (kind === 'areas') {
//     if (item.city && item.city.toLowerCase() !== item.label.toLowerCase()) {
//       return item.city;
//     }
//     return item.province;
//   }
//   if (kind === 'municipalities') {
//     if (item.cityRegion && item.cityRegion.toLowerCase() !== item.label.toLowerCase()) {
//       return item.cityRegion;
//     }
//     return item.province;
//   }
//   const parts = [item.city, item.cityRegion].filter(
//     (part): part is string => Boolean(part?.trim()),
//   );
//   const seen = new Set<string>();
//   const unique = parts.filter(part => {
//     const key = part.toLowerCase();
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });
//   return unique.length > 0 ? unique.join(' · ') : item.province;
// }

// function formatListingCount(count: number): string {
//   if (count >= 1000) {
//     return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
//   }
//   return String(count);
// }

// export function LocationPickerInput({
//   kind,
//   values,
//   onChange,
//   province,
//   parentAreas,
//   parentMunicipalities,
//   placeholder,
//   hasError = false,
// }: Props) {
//   const [draft, setDraft] = useState('');
//   const [focused, setFocused] = useState(false);
//   const dropdownInteractingRef = useRef(false);
//   const debouncedQ = useDebouncedValue(draft.trim(), DEBOUNCE_MS);
//   const meta = KIND_META[kind];

//   const queryParams = useMemo(() => {
//     const params: {
//       province?: string;
//       area?: string[];
//       municipality?: string[];
//       q?: string;
//       limit: number;
//     } = { limit: 50 };

//     if (province?.trim()) params.province = province.trim();
//     if (kind === 'municipalities' && parentAreas?.length) {
//       params.area = parentAreas;
//     }
//     if (kind === 'communities') {
//       if (parentMunicipalities?.length) params.municipality = parentMunicipalities;
//       if (parentAreas?.length) params.area = parentAreas;
//     }
//     if (debouncedQ.length >= MIN_SEARCH_LENGTH) params.q = debouncedQ;
//     return params;
//   }, [kind, province, parentAreas, parentMunicipalities, debouncedQ]);

//   const needsMunicipality =
//     kind === 'communities' && !(parentMunicipalities?.some(value => value.trim()) ?? false);
//   const isEmptyBrowse = debouncedQ.length === 0;
//   const hasSearchQuery = debouncedQ.length >= MIN_SEARCH_LENGTH;
//   const queryEnabled =
//     focused && !needsMunicipality && (isEmptyBrowse || hasSearchQuery);

//   const { data, isFetching, isError } = useLocationSuggestions(kind, queryParams, {
//     enabled: queryEnabled,
//   });

//   const suggestions = useMemo(() => {
//     const seen = new Set(values.map(v => v.toLowerCase()));
//     return (data?.items ?? []).filter(item => !seen.has(item.label.toLowerCase()));
//   }, [data?.items, values]);

//   const defaultPlaceholder =
//     kind === 'areas'
//       ? 'Search areas…'
//       : kind === 'municipalities'
//         ? 'Search municipalities…'
//         : 'Search communities…';

//   function addLabel(label: string) {
//     const trimmed = label.trim();
//     if (!trimmed) return;
//     const key = trimmed.toLowerCase();
//     if (values.some(v => v.toLowerCase() === key)) return;
//     onChange([...values, trimmed]);
//     setDraft('');
//     // Keep the picker active so users can add multiple items without fighting keyboard/focus churn.
//     setFocused(true);
//   }

//   function removeAt(index: number) {
//     onChange(values.filter((_, i) => i !== index));
//   }

//   const showDropdown =
//     focused &&
//     !needsMunicipality &&
//     (isEmptyBrowse || hasSearchQuery) &&
//     (isFetching || suggestions.length > 0 || isError);

//   const showMinLengthHint =
//     focused && !needsMunicipality && draft.trim().length > 0 && draft.trim().length < MIN_SEARCH_LENGTH;

//   const KindIcon = meta.Icon;

//   return (
//     <View style={styles.wrap}>
//       <View
//         style={[
//           styles.searchWrap,
//           focused && !needsMunicipality && styles.searchWrapFocused,
//           hasError && styles.searchWrapError,
//           needsMunicipality && styles.searchWrapDisabled,
//         ]}
//       >
//         <Search
//           size={18}
//           color={focused && !needsMunicipality ? Colors.primary : Colors.textMuted}
//           strokeWidth={2.2}
//         />
//         <TextInput
//           style={styles.searchInput}
//           placeholder={placeholder ?? defaultPlaceholder}
//           placeholderTextColor={Colors.textMuted}
//           value={draft}
//           onChangeText={setDraft}
//           onFocus={() => setFocused(true)}
//           onBlur={() => {
//             setTimeout(() => {
//               if (!dropdownInteractingRef.current) {
//                 setFocused(false);
//               }
//             }, 220);
//           }}
//           autoCapitalize="words"
//           autoCorrect={false}
//           editable={!needsMunicipality}
//         />
//         {isFetching && focused && (
//           <ActivityIndicator size="small" color={Colors.primary} />
//         )}
//       </View>

//       {needsMunicipality && (
//         <View style={styles.callout}>
//           <Text style={styles.calloutText}>
//             Select at least one municipality above to browse communities.
//           </Text>
//         </View>
//       )}

//       {!needsMunicipality && !showDropdown && (
//         <Text style={styles.hint}>
//           Tap to browse top {meta.label.toLowerCase()}, or type {MIN_SEARCH_LENGTH}+ characters.
//         </Text>
//       )}

//       {showMinLengthHint && (
//         <Text style={styles.hintAccent}>
//           {MIN_SEARCH_LENGTH - draft.trim().length} more character
//           {MIN_SEARCH_LENGTH - draft.trim().length === 1 ? '' : 's'} to search…
//         </Text>
//       )}

//       {showDropdown && (
//         <View style={styles.dropdown}>
//           <View style={styles.dropdownHeader}>
//             <View style={styles.dropdownHeaderLeft}>
//               <View style={styles.headerIconBadge}>
//                 <KindIcon size={14} color={Colors.primary} strokeWidth={2.2} />
//               </View>
//               <Text style={styles.dropdownHeaderTitle}>
//                 {isFetching && suggestions.length === 0 ? 'Searching' : meta.label}
//               </Text>
//             </View>
//             {!isFetching && suggestions.length > 0 && (
//               <View style={styles.countBadge}>
//                 <Text style={styles.countBadgeText}>{suggestions.length}</Text>
//               </View>
//             )}
//           </View>

//           {isFetching && suggestions.length === 0 ? (
//             <View style={styles.stateBox}>
//               <ActivityIndicator size="small" color={Colors.primary} />
//               <Text style={styles.stateText}>Finding matches…</Text>
//             </View>
//           ) : isError ? (
//             <View style={styles.stateBox}>
//               <Text style={styles.stateTextError}>Could not load suggestions.</Text>
//               <Text style={styles.stateSubtext}>Check your connection and try again.</Text>
//             </View>
//           ) : suggestions.length === 0 ? (
//             <View style={styles.stateBox}>
//               <KindIcon size={28} color={Colors.borderMid} strokeWidth={1.5} />
//               <Text style={styles.stateText}>{meta.empty}</Text>
//             </View>
//           ) : (
//             <ScrollView
//               style={styles.suggestionList}
//               contentContainerStyle={styles.suggestionListContent}
//               nestedScrollEnabled
//               keyboardShouldPersistTaps="always"
//               onTouchStart={() => {
//                 dropdownInteractingRef.current = true;
//               }}
//               onTouchEnd={() => {
//                 dropdownInteractingRef.current = false;
//               }}
//               onTouchCancel={() => {
//                 dropdownInteractingRef.current = false;
//               }}
//               showsVerticalScrollIndicator={false}
//             >
//               {suggestions.map((item, index) => {
//                 const subtitle = suggestionSubtitle(item, kind);
//                 const isLast = index === suggestions.length - 1;
//                 return (
//                   <TouchableOpacity
//                     key={`${item.type}-${item.label}-${index}`}
//                     style={[styles.suggestionRow, !isLast && styles.suggestionRowBorder]}
//                     onPress={() => {
//                       dropdownInteractingRef.current = false;
//                       addLabel(item.label);
//                     }}
//                     activeOpacity={0.65}
//                   >
//                     <View style={styles.suggestionIconBadge}>
//                       <KindIcon size={16} color={Colors.primary} strokeWidth={2} />
//                     </View>
//                     <View style={styles.suggestionBody}>
//                       <Text style={styles.suggestionLabel} numberOfLines={2}>
//                         {item.label}
//                       </Text>
//                       {subtitle ? (
//                         <Text style={styles.suggestionSubtitle} numberOfLines={1}>
//                           {subtitle}
//                         </Text>
//                       ) : null}
//                     </View>
//                     {item.listingCount > 0 && (
//                       <View style={styles.listingPill}>
//                         <Text style={styles.listingPillCount}>
//                           {formatListingCount(item.listingCount)}
//                         </Text>
//                         <Text style={styles.listingPillLabel}>listings</Text>
//                       </View>
//                     )}
//                     <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
//                   </TouchableOpacity>
//                 );
//               })}
//             </ScrollView>
//           )}
//         </View>
//       )}

//       {values.length > 0 && (
//         <View style={styles.selectedSection}>
//           <Text style={styles.selectedLabel}>Selected</Text>
//           <View style={styles.chipsWrap}>
//             {values.map((item, index) => (
//               <TouchableOpacity
//                 key={`${item}-${index}`}
//                 style={styles.locationChip}
//                 onPress={() => removeAt(index)}
//                 activeOpacity={0.7}
//               >
//                 <KindIcon size={13} color={Colors.primary} strokeWidth={2.2} />
//                 <Text style={styles.locationChipText} numberOfLines={1}>
//                   {item}
//                 </Text>
//                 <Text style={styles.locationChipRemove}>×</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: {
//     gap: 10,
//   },
//   searchWrap: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     borderWidth: 1.5,
//     borderColor: Colors.borderMid,
//     borderRadius: 12,
//     backgroundColor: Colors.subtle,
//     paddingHorizontal: 14,
//     minHeight: 46,
//   },
//   searchWrapFocused: {
//     borderColor: Colors.primary,
//     backgroundColor: Colors.surface,
//     shadowColor: Colors.primary,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.12,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   searchWrapError: {
//     borderColor: '#FC8181',
//   },
//   searchWrapDisabled: {
//     opacity: 0.55,
//     backgroundColor: Colors.border,
//   },
//   searchInput: {
//     flex: 1,
//     paddingVertical: 11,
//     fontSize: 15,
//     color: Colors.text,
//     fontWeight: '500',
//   },
//   callout: {
//     backgroundColor: Colors.primaryLight,
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderWidth: 1,
//     borderColor: '#bfdbfe',
//   },
//   calloutText: {
//     fontSize: 12,
//     lineHeight: 17,
//     color: Colors.primary,
//     fontWeight: '500',
//   },
//   hint: {
//     fontSize: 11,
//     color: Colors.textMuted,
//     lineHeight: 16,
//     paddingHorizontal: 2,
//   },
//   hintAccent: {
//     fontSize: 11,
//     color: Colors.primary,
//     lineHeight: 16,
//     fontWeight: '500',
//     paddingHorizontal: 2,
//   },
//   dropdown: {
//     borderRadius: 14,
//     backgroundColor: Colors.surface,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     shadowColor: '#1a1f36',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.1,
//     shadowRadius: 16,
//     elevation: 5,
//     overflow: 'hidden',
//   },
//   dropdownHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 14,
//     paddingVertical: 11,
//     backgroundColor: Colors.subtle,
//     borderBottomWidth: 1,
//     borderBottomColor: Colors.border,
//   },
//   dropdownHeaderLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   headerIconBadge: {
//     width: 26,
//     height: 26,
//     borderRadius: 8,
//     backgroundColor: Colors.primaryLight,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   dropdownHeaderTitle: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: Colors.textSub,
//     letterSpacing: 0.6,
//     textTransform: 'uppercase',
//   },
//   countBadge: {
//     backgroundColor: Colors.primaryLight,
//     paddingHorizontal: 9,
//     paddingVertical: 3,
//     borderRadius: 99,
//     minWidth: 28,
//     alignItems: 'center',
//   },
//   countBadgeText: {
//     fontSize: 11,
//     fontWeight: '700',
//     color: Colors.primary,
//   },
//   stateBox: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     paddingHorizontal: 20,
//     paddingVertical: 28,
//   },
//   stateText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: Colors.textSub,
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//   stateTextError: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#C53030',
//     textAlign: 'center',
//   },
//   stateSubtext: {
//     fontSize: 12,
//     color: Colors.textMuted,
//     textAlign: 'center',
//   },
//   suggestionList: {
//     maxHeight: DROPDOWN_MAX_HEIGHT,
//   },
//   suggestionListContent: {
//     flexGrow: 0,
//     paddingVertical: 4,
//   },
//   suggestionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 11,
//     gap: 10,
//   },
//   suggestionRowBorder: {
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: Colors.border,
//   },
//   suggestionIconBadge: {
//     width: 38,
//     height: 38,
//     borderRadius: 11,
//     backgroundColor: Colors.primaryLight,
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   suggestionBody: {
//     flex: 1,
//     minWidth: 0,
//     gap: 2,
//   },
//   suggestionLabel: {
//     fontSize: 15,
//     color: Colors.text,
//     fontWeight: '600',
//     lineHeight: 20,
//   },
//   suggestionSubtitle: {
//     fontSize: 12,
//     color: Colors.textMuted,
//     lineHeight: 16,
//   },
//   listingPill: {
//     alignItems: 'center',
//     backgroundColor: Colors.subtle,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     borderRadius: 8,
//     paddingHorizontal: 8,
//     paddingVertical: 5,
//     minWidth: 52,
//     flexShrink: 0,
//   },
//   listingPillCount: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: Colors.text,
//     lineHeight: 14,
//   },
//   listingPillLabel: {
//     fontSize: 9,
//     fontWeight: '600',
//     color: Colors.textMuted,
//     textTransform: 'uppercase',
//     letterSpacing: 0.3,
//   },
//   selectedSection: {
//     gap: 8,
//     marginTop: 2,
//   },
//   selectedLabel: {
//     fontSize: 11,
//     fontWeight: '600',
//     color: Colors.textSub,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//     paddingHorizontal: 2,
//   },
//   chipsWrap: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   locationChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     maxWidth: '100%',
//     paddingLeft: 10,
//     paddingRight: 8,
//     paddingVertical: 7,
//     borderRadius: 99,
//     borderWidth: 1.5,
//     borderColor: Colors.primary,
//     backgroundColor: Colors.primaryLight,
//   },
//   locationChipText: {
//     flexShrink: 1,
//     fontSize: 13,
//     fontWeight: '600',
//     color: Colors.primary,
//     maxWidth: 200,
//   },
//   locationChipRemove: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: Colors.primary,
//     lineHeight: 18,
//     marginLeft: 2,
//   },
// });
