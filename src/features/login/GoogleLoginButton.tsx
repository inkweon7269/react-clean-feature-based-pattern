import { Button } from '@/shared/ui/button';
import { getGoogleOAuthStartUrl } from '@/infrastructure/api/auth/oauthStartUrl';

export function GoogleLoginButton() {
  const onClick = () => {
    window.location.href = getGoogleOAuthStartUrl();
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      Google로 계속
    </Button>
  );
}
