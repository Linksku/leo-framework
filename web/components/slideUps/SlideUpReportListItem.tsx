import ExclamationSvg from '@fortawesome/fontawesome-free/svgs/solid/exclamation-circle.svg';

import styles from './SlideUpReportListItemStyles.scss';

export default function SlideUpReportListItem({
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
      className={styles.listItem}
      onClick={async () => fetchApi()}
      role="button"
      tabIndex={-1}
    >
      <ExclamationSvg />
      Report
    </div>
  );
}
