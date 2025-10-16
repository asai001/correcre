import Image from "next/image";
import LoginForm from "@admin/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-white">
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
