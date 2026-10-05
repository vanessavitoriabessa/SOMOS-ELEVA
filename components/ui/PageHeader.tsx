import "./ui.css";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
}: Props) {
  return (
    <div className="eleva-page-header">

      {icon && (
        <div className="eleva-page-icon">
          {icon}
        </div>
      )}

      <div className="eleva-page-content">

        {eyebrow && (
          <span className="eleva-page-eyebrow">
            {eyebrow}
          </span>
        )}

        <h1>{title}</h1>

        {subtitle && (
          <p>{subtitle}</p>
        )}

      </div>

    </div>
  );
}