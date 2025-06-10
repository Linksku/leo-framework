import EyeSvg from 'svgs/fa5/regular/eye.svg';
import EyeSlashSvg from 'svgs/fa5/regular/eye-slash.svg';

export default function PasswordInput({
  disabled,
  ...props
}: Parameters<typeof Input>[0]) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      // Not changing to "password" on submit might affect password managers
      type={showPassword && !disabled ? 'text' : 'password'}
      placeholder={showPassword ? '' : '••••••••'}
      SuffixSvg={showPassword ? EyeSlashSvg : EyeSvg}
      suffixProps={{
        onClick: () => setShowPassword(s => !s),
      }}
      disabled={disabled}
      {...props}
    />
  );
}
