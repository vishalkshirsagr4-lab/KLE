import Icon from './Icon';

export default function Button({
  children,
  href,
  variant = 'primary',
  className = '',
  icon = 'arrowUpRight',
  iconAfter = true,
  ...props
}) {
  const classes = `ui-button ui-button-${variant} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {iconAfter && icon && <Icon name={icon} size={16} />}
    </>
  );

  if (href) return <a className={classes} href={href} {...props}>{content}</a>;
  return <button className={classes} {...props}>{content}</button>;
}
