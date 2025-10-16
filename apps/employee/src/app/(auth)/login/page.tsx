import Image from "next/image";
import LoginForm from "apps/employee/src/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-br from-blue-200  via-teal-50 to-blue-200">
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 w-9/10 max-w-[400px]">
        <LoginForm></LoginForm>
      </div>
      <Image
        className="absolute bottom-5 right-7.5 lg:bottom-15 lg:right-20 w-16 h-auto lg:w-[110px]"
        src="/correcre-icon.svg"
        alt=""
        width={110}
        height={66}
      />
    </div>
  );
}
