import ExclamationSvg from '@fortawesome/fontawesome-free/svgs/solid/exclamation-circle.svg';

export default function PostSlideUpReportListItem({
  entityType,
  entityId,
}: {
  entityType: string,
  entityId: number,
}) {
  const showToast = useShowToast();
  // todo: mid/mid hide post after reporting, maybe hide from future loads
  const { fetchApi } = useDeferredApi(
    'report',
    { entityType, entityId },
    {
      type: 'create',
      onFetch() {
        showToast({ msg: 'Reported successfully.' });
      },
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
