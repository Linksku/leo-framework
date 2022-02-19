import ExclamationSvg from 'fontawesome5/svgs/solid/exclamation-circle.svg';

export default function ReportSlideUpListItem({
  entityType,
  entityId,
}: {
  entityType: Report['entityType'],
  entityId: NumericEntityId,
}) {
  // todo: mid/mid hide post after reporting, maybe hide from future loads
  const { fetchApi } = useDeferredApi(
    'report',
    { entityType, entityId },
    {
      type: 'create',
      successMsg: 'Reported successfully',
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
