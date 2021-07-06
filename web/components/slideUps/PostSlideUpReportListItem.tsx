import ExclamationSvg from '@fortawesome/fontawesome-free/svgs/solid/exclamation-circle.svg';

export default function PostSlideUpReportListItem({
  entityType,
  entityId,
}: {
  entityType: string,
  entityId: number,
}) {
  const showToast = useShowToast();
  const { fetchApi } = useDeferredApi(
    'report',
    { entityType, entityId },
    {
      type: 'create',
      onFetch: useCallback(() => {
        showToast({ msg: 'Reported successfully.' });
      }, [showToast]),
      onError: useCallback(() => {
        showToast({ msg: 'Failed to report.' });
      }, [showToast]),
    },
  );
  return (
    <div
      onClick={() => {
        void fetchApi();
      }}
      role="button"
      tabIndex={-1}
    >
      <ExclamationSvg />
      Report
    </div>
  );
}
