import throttle from 'lib/throttle';
import createMemoCache from 'lib/createMemoCache';

import Input from './Input';
import Dropdown from './Dropdown';

import styles from './TypeaheadStyles.scss';

type Props = MemoObjShallow<{
  defaultValue?: string,
  fetchResults?: (s: string) => void,
  // todo: low/mid rewrite Typeahead to accept results directly
  getResults: (s: string) => { key: string | null, name: string }[],
  onChange?: (key: string | null, val?: string) => void,
  className?: string | null,
  defaultElement?: ReactElement,
  lastElement?: ReactElement,
  inputProps: Parameters<typeof Input>[0],
  inputRef?: React.RefCallback<HTMLInputElement>,
  clearOnSelect?: boolean,
}>;

type State = {
  defaultValue?: string,
  input: string,
  isFocused: boolean,
};

// todo: low/mid rewrite typeahead using hooks
export default class Typeahead extends React.PureComponent<Props, State> {
  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State,
  ) {
    if (nextProps.defaultValue === prevState.defaultValue) {
      return null;
    }
    return {
      defaultValue: nextProps.defaultValue,
      input: nextProps.defaultValue ?? '',
    };
  }

  _memoResults = createMemoCache();

  _memoMouseDown = createMemoCache();

  _containerRef = null as HTMLDivElement | null;

  _hasOpened = false;

  constructor(props: Props) {
    super(props);

    this._throttledFetchResults = this.props.fetchResults
      ? throttle<Typeahead>(
        this.props.fetchResults,
        {
          timeout: 1000,
          allowSchedulingDuringDelay: true,
        },
      )
      : null;

    this.state = {
      defaultValue: props.defaultValue,
      input: props.defaultValue ?? '',
      isFocused: false,
    };
  }

  componentDidMount() {
    const { defaultValue } = this.props;
    if (defaultValue) {
      this._throttledFetchResults?.(defaultValue);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fetchResults !== this.props.fetchResults) {
      this._throttledFetchResults = this.props.fetchResults
        ? throttle<Typeahead>(
          this.props.fetchResults,
          {
            timeout: 1000,
            allowSchedulingDuringDelay: true,
          },
        )
        : null;
    }
  }

  componentWillUnmount() {
    window.removeEventListener('click', this._handleClickOutside);
  }

  _throttledFetchResults: ((s: string) => void) | null;

  _handleLoad = (ref: HTMLDivElement | null) => {
    this._containerRef = ref;
  };

  _handleFocus = () => {
    this.setState(
      { isFocused: true },
      () => window.addEventListener('click', this._handleClickOutside),
    );
    // Initial open.
    if (!this._hasOpened) {
      this._throttledFetchResults?.(this.state.input);
      this._hasOpened = true;
    }
  };

  _handleClickOutside = (event: MouseEvent) => {
    if (!this._containerRef?.contains(event.target as Node)) {
      window.removeEventListener('click', this._handleClickOutside);
      this.setState({ isFocused: false });
    }
  };

  _handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    this.setState({ input });
    this._throttledFetchResults?.(input);
  };

  render() {
    const {
      defaultValue,
      getResults,
      onChange,
      className,
      defaultElement,
      lastElement,
      inputProps,
      inputRef,
      clearOnSelect,
    } = this.props;
    const { input, isFocused } = this.state;
    const results = this._memoResults(() => getResults(input.trim()), [getResults, input]);

    const isOpen = isFocused
      && !!(results.length || defaultElement)
      && defaultValue !== input;
    const onOptionMouseDown = this._memoMouseDown(
      () => (event: React.MouseEvent, key: string | null, name: string) => {
        event.preventDefault();
        if (clearOnSelect) {
          this.setState({
            input: '',
          });
        } else {
          window.removeEventListener('click', this._handleClickOutside);
          this.setState({
            input: name,
            isFocused: false,
          });
        }
        this._throttledFetchResults?.(input);
        onChange?.(key, name);
      },
      [clearOnSelect, onChange],
    );

    return (
      <div
        ref={this._handleLoad}
        className={cn(styles.container, className, { [styles.open]: isOpen })}
      >
        <Input
          ref={inputRef}
          className={styles.input}
          onFocus={this._handleFocus}
          onClick={this._handleFocus}
          onChange={this._handleChange}
          value={input}
          autoComplete="off"
          {...inputProps}
        />
        <Dropdown
          options={results}
          defaultElement={defaultElement}
          lastElement={lastElement}
          open={isOpen}
          onOptionMouseDown={onOptionMouseDown}
        />
      </div>
    );
  }
}
