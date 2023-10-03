import type { default as _constate } from 'constate';
import type { default as _cx } from 'clsx';
import type _React from 'react';
import type { createElement as _ReactCreateElement } from 'react';
import type { useCallback as _useCallback } from 'react';
import type { useContext as _useContext } from 'react';
import type { useDeferredValue as _useDeferredValue } from 'react';
import type { useDebugValue as _useDebugValue } from 'react';
import type { useEffect as _useEffect } from 'react';
import type { useFormState as _useFormState } from 'react-hook-form';
import type { useImperativeHandle as _useImperativeHandle } from 'react';
import type { useLayoutEffect as _useLayoutEffect } from 'react';
import type { useMemo as _useMemo } from 'react';
import type { useReducer as _useReducer } from 'react';
import type { useRef as _useRef } from 'react';
import type { useState as _useState } from 'react';
import type { useTransition as _useTransition } from 'react';
import type { default as _Button } from '../../components/ui/Button';
import type { default as _Checkbox } from '../../components/ui/Checkbox';
import type { default as _FileInput } from '../../components/ui/FileInput';
import type { default as _Input } from '../../components/ui/Input';
import type { default as _Link } from '../../components/ui/Link';
import type { default as _Radio } from '../../components/ui/Radio';
import type { default as _Select } from '../../components/ui/Select';
import type { default as _Spinner } from '../../components/ui/Spinner';
import type { default as _Table } from '../../components/ui/Table';
import type { default as _Textarea } from '../../components/ui/Textarea';
import type { default as _ToggleButton } from '../../components/ui/ToggleButton';
import type { default as _ToggleSwitch } from '../../components/ui/ToggleSwitch';
import type { default as _Typeahead } from '../../components/ui/Typeahead';
import type { default as _UncontrolledCheckbox } from '../../components/ui/UncontrolledCheckbox';
import type { HOME_TABS as _HOME_TABS } from '../../../../app/shared/config/homeTabs';
import type { default as _EMPTY_ARR } from '../../utils/emptyArr';
import type { default as _EMPTY_MAP } from '../../utils/emptyMap';
import type { default as _EMPTY_OBJ } from '../../utils/emptyObj';
import type { default as _ErrorLogger } from '../../services/ErrorLogger';
import type { default as _markStable } from '../../utils/markStable';
import type { default as _NOOP } from '../../utils/noop';
import type { default as _TestIds } from '../../../shared/consts/testIds';
import type { default as _useAllEntities } from '../../hooks/entities/useAllEntities';
import type { default as _useApi } from '../../hooks/api/useApi';
import type { default as _useCatchAsync } from '../../hooks/useCatchAsync';
import type { default as _useConst } from '../../hooks/useConst';
import type { default as _useDeferredApi } from '../../hooks/api/useDeferredApi';
import type { default as _useDeepMemoObj } from '../../hooks/useDeepMemoObj';
import type { default as _useDynamicCallback } from '../../hooks/useDynamicCallback';
import type { default as _useEntity } from '../../hooks/entities/useEntity';
import type { default as _useEntitiesArr } from '../../hooks/entities/useEntitiesArr';
import type { default as _useForm } from '../../hooks/useForm';
import type { default as _useGlobalMemo } from '../../hooks/useGlobalMemo';
import type { default as _useGlobalState } from '../../hooks/useGlobalState';
import type { default as _useLatest } from '../../hooks/useLatest';
import type { default as _useLog } from '../../hooks/useLog';
import type { default as _useLogChanged } from '../../hooks/useLogChanged';
import type { default as _useLogLifecycle } from '../../hooks/useLogLifecycle';
import type { default as _usePushHome } from '../../hooks/usePushHome';
import type { default as _useRelation } from '../../hooks/entities/useRelation';
import type { default as _useRequiredRelation } from '../../hooks/entities/useRequiredRelation';
import type { default as _useRequiredEntity } from '../../hooks/entities/useRequiredEntity';
import type { default as _useSse } from '../../hooks/useSse';
import type { default as _useSseArr } from '../../hooks/useSseArr';
import type { default as _useStateStable } from '../../hooks/useStateStable';
import type { default as _wrapPromise } from '../../utils/wrapPromise';
import type { useAlertsStore as _useAlertsStore } from '../../stores/AlertsStore';
import type { useApiStore as _useApiStore } from '../../stores/ApiStore';
import type { useAuthStore as _useAuthStore } from '../../stores/AuthStore';
import type { useEntitiesStore as _useEntitiesStore } from '../../stores/EntitiesStore';
import type { useHistoryStore as _useHistoryStore } from '../../stores/HistoryStore';
import type { useHomeNavStore as _useHomeNavStore } from '../../stores/HomeNavStore';
import type { useRelationsStore as _useRelationsStore } from '../../stores/RelationsStore';
import type { useRouteStore as _useRouteStore } from '../../stores/RouteStore';
import type { useSlideUpStore as _useSlideUpStore } from '../../stores/SlideUpStore';
import type { useSseStore as _useSseStore } from '../../stores/SseStore';
import type { useStacksNavStore as _useStacksNavStore } from '../../stores/StacksNavStore';
import type { useToastsStore as _useToastsStore } from '../../stores/ToastsStore';
import type { useUIFrameStore as _useUIFrameStore } from '../../stores/UIFrameStore';
import type { useAuthState as _useAuthState } from '../../stores/AuthStore';
import type { useCurrentUserId as _useCurrentUserId } from '../../stores/AuthStore';
import type { useHideSlideUp as _useHideSlideUp } from '../../stores/SlideUpStore';
import type { useHomeTab as _useHomeTab } from '../../stores/HomeNavStore';
import type { useMutateApiCache as _useMutateApiCache } from '../../stores/ApiStore';
import type { useMutateEntity as _useMutateEntity } from '../../stores/EntitiesStore';
import type { usePushPath as _usePushPath } from '../../stores/HistoryStore';
import type { useReloadPage as _useReloadPage } from '../../stores/UIFrameStore';
import type { useReplacePath as _useReplacePath } from '../../stores/HistoryStore';
import type { useRouteMatches as _useRouteMatches } from '../../stores/RouteStore';
import type { useRouteQuery as _useRouteQuery } from '../../stores/RouteStore';
import type { useShowAlert as _useShowAlert } from '../../stores/AlertsStore';
import type { useShowConfirm as _useShowConfirm } from '../../stores/AlertsStore';
import type { useShowSlideUp as _useShowSlideUp } from '../../stores/SlideUpStore';
import type { useShowToast as _useShowToast } from '../../stores/ToastsStore';
import type { useWindowSize as _useWindowSize } from '../../stores/UIFrameStore';

declare global {
  const constate: typeof _constate;
  const cx: typeof _cx;
  const React: typeof _React;
  const ReactCreateElement: typeof _ReactCreateElement;
  const useCallback: typeof _useCallback;
  const useContext: typeof _useContext;
  const useDeferredValue: typeof _useDeferredValue;
  const useDebugValue: typeof _useDebugValue;
  const useEffect: typeof _useEffect;
  const useFormState: typeof _useFormState;
  const useImperativeHandle: typeof _useImperativeHandle;
  const useLayoutEffect: typeof _useLayoutEffect;
  const useMemo: typeof _useMemo;
  const useReducer: typeof _useReducer;
  const useRef: typeof _useRef;
  const useState: typeof _useState;
  const useTransition: typeof _useTransition;
  const Button: typeof _Button;
  const Checkbox: typeof _Checkbox;
  const FileInput: typeof _FileInput;
  const Input: typeof _Input;
  const Link: typeof _Link;
  const Radio: typeof _Radio;
  const Select: typeof _Select;
  const Spinner: typeof _Spinner;
  const Table: typeof _Table;
  const Textarea: typeof _Textarea;
  const ToggleButton: typeof _ToggleButton;
  const ToggleSwitch: typeof _ToggleSwitch;
  const Typeahead: typeof _Typeahead;
  const UncontrolledCheckbox: typeof _UncontrolledCheckbox;
  const HOME_TABS: typeof _HOME_TABS;
  const EMPTY_ARR: typeof _EMPTY_ARR;
  const EMPTY_MAP: typeof _EMPTY_MAP;
  const EMPTY_OBJ: typeof _EMPTY_OBJ;
  const ErrorLogger: typeof _ErrorLogger;
  const markStable: typeof _markStable;
  const NOOP: typeof _NOOP;
  const TestIds: typeof _TestIds;
  const useAllEntities: typeof _useAllEntities;
  const useApi: typeof _useApi;
  const useCatchAsync: typeof _useCatchAsync;
  const useConst: typeof _useConst;
  const useDeferredApi: typeof _useDeferredApi;
  const useDeepMemoObj: typeof _useDeepMemoObj;
  const useDynamicCallback: typeof _useDynamicCallback;
  const useEntity: typeof _useEntity;
  const useEntitiesArr: typeof _useEntitiesArr;
  const useForm: typeof _useForm;
  const useGlobalMemo: typeof _useGlobalMemo;
  const useGlobalState: typeof _useGlobalState;
  const useLatest: typeof _useLatest;
  const useLog: typeof _useLog;
  const useLogChanged: typeof _useLogChanged;
  const useLogLifecycle: typeof _useLogLifecycle;
  const usePushHome: typeof _usePushHome;
  const useRelation: typeof _useRelation;
  const useRequiredRelation: typeof _useRequiredRelation;
  const useRequiredEntity: typeof _useRequiredEntity;
  const useSse: typeof _useSse;
  const useSseArr: typeof _useSseArr;
  const useStateStable: typeof _useStateStable;
  const wrapPromise: typeof _wrapPromise;
  const useAlertsStore: typeof _useAlertsStore;
  const useApiStore: typeof _useApiStore;
  const useAuthStore: typeof _useAuthStore;
  const useEntitiesStore: typeof _useEntitiesStore;
  const useHistoryStore: typeof _useHistoryStore;
  const useHomeNavStore: typeof _useHomeNavStore;
  const useRelationsStore: typeof _useRelationsStore;
  const useRouteStore: typeof _useRouteStore;
  const useSlideUpStore: typeof _useSlideUpStore;
  const useSseStore: typeof _useSseStore;
  const useStacksNavStore: typeof _useStacksNavStore;
  const useToastsStore: typeof _useToastsStore;
  const useUIFrameStore: typeof _useUIFrameStore;
  const useAuthState: typeof _useAuthState;
  const useCurrentUserId: typeof _useCurrentUserId;
  const useHideSlideUp: typeof _useHideSlideUp;
  const useHomeTab: typeof _useHomeTab;
  const useMutateApiCache: typeof _useMutateApiCache;
  const useMutateEntity: typeof _useMutateEntity;
  const usePushPath: typeof _usePushPath;
  const useReloadPage: typeof _useReloadPage;
  const useReplacePath: typeof _useReplacePath;
  const useRouteMatches: typeof _useRouteMatches;
  const useRouteQuery: typeof _useRouteQuery;
  const useShowAlert: typeof _useShowAlert;
  const useShowConfirm: typeof _useShowConfirm;
  const useShowSlideUp: typeof _useShowSlideUp;
  const useShowToast: typeof _useShowToast;
  const useWindowSize: typeof _useWindowSize;
}
