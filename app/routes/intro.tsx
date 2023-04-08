import type { V2_MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Spacer } from "~/components/Spacer";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Budgetsco" }];
};

export default function Intro() {
  const [startingPrice, setStartingPrice] = useState<string>();

  async function getStartingPrice() {
    try {
      const gpbSupported = "getDigitalGoodsService" in window;
      if (!gpbSupported) return;
      const service = await window.getDigitalGoodsService(
        "https://play.google.com/billing"
      );
      if (service) {
        const skus = await service.getDetails(["monthly_sub"]);
        if (skus && skus.length) {
          setStartingPrice(
            new Intl.NumberFormat(navigator.language, {
              style: "currency",
              currency: skus[0].price.currency,
            }).format(skus[0].price.value)
          );
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getStartingPrice();
  }, []);

  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60%"
          height="35%"
          viewBox="0 0 650 650"
          data-name="Layer 1"
        >
          <path
            fill="#e6e6e6"
            d="M421.95 528.307c-5.122-7.172-12.055-12.42-20.772-14.383-7.6-1.713-15.416-1.42-23.142-1.361l-97.692.753c-8.367.065-16.389 7.313-16 16 .386 8.614 7.032 16.07 16 16q42.926-.33 85.85-.662c6.748-.052 13.498-.174 20.245-.151 1.515.004 3.024.084 4.538.102.366.004.631 0 .818-.007.047.014.086.027.147.044.79.216 1.6.366 2.394.572-.278.008.516.503.914.67.055.109.171.3.366.596.272.51 1.077 2.059 1.11 2.01a71.762 71.762 0 0 1 2.987 9.393c1.86 7.047 2.268 8.52 2.536 15.132.338 8.352 7.117 16.397 16 16 8.379-.376 16.363-7.043 16-16-.611-15.095-3.26-32.05-12.3-44.708Z"
          />
          <path
            fill="#e6e6e6"
            d="M286.087 564.413c-1.835-11.12-3.635-22.247-5.506-33.36-1.898-11.274-5.774-21.598-14.548-28.997-2.344-1.977-4.775-3.823-7.216-5.663a197.05 197.05 0 0 1-2.563-1.956l-.127-.099-.355-.302c-3.657-3.095-7.19-6.327-10.556-9.763q-4.483-4.578-8.575-9.545-1.022-1.241-2.018-2.504c-.115-.145-.73-.94-1.135-1.459-.377-.52-1.066-1.457-1.182-1.62q-1.164-1.646-2.286-3.323a156.126 156.126 0 0 1-13.187-24.115q-.547-1.251-1.068-2.517l-.374-1.029c-.742-2.038-1.481-4.074-2.159-6.137q-2.16-6.57-3.714-13.336-.768-3.34-1.383-6.715-.317-1.735-.593-3.477c-.03-.193-.21-1.447-.316-2.155-.078-.711-.224-1.971-.244-2.166q-.175-1.756-.312-3.516-.306-3.96-.415-7.934-.184-7.061.253-14.121c.166-2.645.403-5.283.694-7.916l.044-.406.062-.418c.216-1.455.442-2.908.696-4.356a159.294 159.294 0 0 1 3.739-16.313q1.087-3.809 2.363-7.556.568-1.663 1.172-3.314c-.026.071 1.183-3.015 1.199-3.119 4.795-11.329 12.637-21.657 12.648-34.526.007-8.714-7.364-17.06-16-16.658a16.625 16.625 0 0 0-16 16.658l-.001.524c-.08.271-.148.498-.209.698-.935 2.032-2.08 3.963-3.107 5.944-2.81 5.424-5.21 11.025-7.488 16.709a159.825 159.825 0 0 0-8.53 28.628 182.098 182.098 0 0 0-.967 65.04c6.203 37.813 26.662 74.01 55.103 98.34a225.777 225.777 0 0 0 7.549 6.15c1.056.828 2.12 1.64 3.191 2.446.506.382 2.602 2.034 1.68 1.233 1.982 1.692 2.817 2.544 3.326 3.79l.31 1.21c.36 1.406.7 2.808.983 4.233 2.476 12.452 4.197 25.112 6.265 37.644 1.421 8.61 12.022 14.215 19.682 11.634 8.916-3.004 12.697-11.264 11.175-20.49Z"
          />
          <path
            fill="#3f3d56"
            d="M423.568 596.708a25.374 25.374 0 0 1-25.44-25.25v-18.252c-19.11 2.14-84.543 1.644-103.3-1.37v18.892a25.44 25.44 0 0 1-50.88 0v-37.092a163.307 163.307 0 0 1-84-142.388c0-49.83 22.583-96.315 61.958-127.534a164.075 164.075 0 0 1 89.323-35.173c4.427-.347 8.88-.523 13.239-.523 15.352 0 84.618 2.371 101.997 7.371l39.628-39.321a4.16 4.16 0 0 1 4.55-.907 4.1 4.1 0 0 1 2.585 3.847v6.252l7.716-7.643a4.15 4.15 0 0 1 4.546-.908 4.102 4.102 0 0 1 2.588 3.848v69.865a162.76 162.76 0 0 1-39.07 267.866v33.17a25.374 25.374 0 0 1-25.44 25.25Zm-23.44-45.77v20.52a23.44 23.44 0 0 0 46.88 0v-34.433l.57-.27a162.456 162.456 0 0 0 66.531-58.183 160.325 160.325 0 0 0-27.699-206.96l-.332-.298v-70.757a2.103 2.103 0 0 0-1.342-1.995 2.15 2.15 0 0 0-2.381.473l-11.127 11.02v-11.047a2.103 2.103 0 0 0-1.342-1.996 2.154 2.154 0 0 0-2.385.476l-40.477 40.164-.575-.18c-16.156-5.057-86.513-7.454-101.982-7.454-4.305 0-8.707.174-13.081.517a162.075 162.075 0 0 0-88.237 34.746c-38.894 30.838-61.202 76.751-61.202 125.967a161.315 161.315 0 0 0 83.485 140.925l.516.285v38.27a23.441 23.441 0 0 0 46.88 0v-21.286l1.185.223c16.855 3.171 87.832 3.671 104.985 1.421Z"
          />
          <path
            fill="#047857"
            d="m287.998 119.118-110.74 33.28a13.882 13.882 0 0 0 7.99 26.59l96.91-29.13 2.03-.61a67.517 67.517 0 0 1 8.29-29.86 6.165 6.165 0 0 0-2-.52 6.367 6.367 0 0 0-2.48.25Z"
          />
          <path
            fill="#2f2e41"
            d="M183.333 186.083a7.013 7.013 0 0 1-6.638-4.801l-6.925-20.896a7 7 0 0 1 4.443-8.847l90.132-29.87a7 7 0 0 1 8.846 4.442l6.925 20.896a6.976 6.976 0 0 1-4.193 8.759q-.125.047-.252.088l-90.13 29.87a7.003 7.003 0 0 1-2.208.359Z"
          />
          <path
            fill="#3f3d56"
            d="M352.128 82.008a70.031 70.031 0 0 0-69.97 67.85c-.02.71-.03 1.43-.03 2.15a70 70 0 1 0 70-70Zm0 138a68.071 68.071 0 0 1-68-68q0-1.395.06-2.76a67.998 67.998 0 1 1 67.94 70.76Z"
          />
          <path
            fill="#e6e6e6"
            d="M411.128 152.008a59 59 0 0 1-118 0c0-1.87.09-3.71.26-5.53a59 59 0 0 1 117.74 5.53Z"
          />
          <path
            fill="#047857"
            d="M369.698 155.928a14.048 14.048 0 0 0-5.47-4.33 53.139 53.139 0 0 0-8.22-2.7v-16.06a23.396 23.396 0 0 1 11.69 5.33l3.26-6.95a21.56 21.56 0 0 0-6.36-3.93 31.26 31.26 0 0 0-8.07-2.07v-8.14h-7.55v8.22a20.672 20.672 0 0 0-8.25 2.77 16.399 16.399 0 0 0-5.59 5.48 13.771 13.771 0 0 0-1.99 7.29 12.463 12.463 0 0 0 2.29 7.8 14.51 14.51 0 0 0 5.7 4.52 52.692 52.692 0 0 0 8.36 2.77v15.39a24.988 24.988 0 0 1-13.91-5.55l-3.26 6.96a24.58 24.58 0 0 0 7.44 4.22 34.161 34.161 0 0 0 9.21 1.92v8.07h7.55v-8.22a19.538 19.538 0 0 0 11.21-5.14 13.59 13.59 0 0 0 4.18-10.1 12.055 12.055 0 0 0-2.22-7.55Zm-20.2-8.73a14.499 14.499 0 0 1-5.03-2.7 5.32 5.32 0 0 1-1.78-4.18 6.726 6.726 0 0 1 1.82-4.81 9.202 9.202 0 0 1 4.99-2.59Zm11.25 21.28a8.557 8.557 0 0 1-4.74 2.47v-13.24a13.24 13.24 0 0 1 4.74 2.37 4.658 4.658 0 0 1 1.63 3.7 6.804 6.804 0 0 1-1.63 4.7Z"
          />
          <path
            fill="#2f2e41"
            d="M186.547 270.772a7.023 7.023 0 0 1-6.775-5.216l-3.77-14.27a7.004 7.004 0 0 1 4.975-8.551l118.94-31.43a7.015 7.015 0 0 1 8.551 4.985l3.194 12.09-.598.047a160.163 160.163 0 0 0-84.108 31.87l-.173.085-38.46 10.16a6.963 6.963 0 0 1-1.776.23Z"
          />
          <path
            fill="#3f3d56"
            d="M166.848 341.258a98.108 98.108 0 0 1-39.122-14.792 95.527 95.527 0 0 1-16.174-13.228c-4.828-4.925-9.447-10.522-11.838-17.08a25.299 25.299 0 0 1 .331-18.769 24.334 24.334 0 0 1 13.169-13.125c5.99-2.389 13.226-2.645 19.055-.029a17.09 17.09 0 0 1 6.965 5.606 11.435 11.435 0 0 1 1.81 3.758 7.674 7.674 0 0 1 .09 3.76 9.016 9.016 0 0 1-4.774 5.722 24.068 24.068 0 0 1-8.152 2.487c-2.86.39-6.968.745-9.268-1.551a4.67 4.67 0 0 1-1.092-1.611 3.114 3.114 0 0 1-.173-1.458c-.033.217.139-.472.13-.445-.037.102-.195.35.03-.031a3.397 3.397 0 0 1 .232-.363c-.076.098-.243.262.055-.02a1.962 1.962 0 0 1 .915-.564c.138-.04.279-.072.417-.11.353-.097-.351.005.01-.007.139-.004.28 0 .419-.007.354-.016-.35-.096-.01-.011.131.033.262.065.392.106.282.09-.2-.207-.009.015.224.26-.235-.253.02-.001a4.624 4.624 0 0 1 .357.394 2.36 2.36 0 0 0 3.315 0 2.4 2.4 0 0 0 0-3.315c-2.311-2.865-6.877-2.157-9.215.264-2.982 3.089-1.801 7.983 1.1 10.678 3.283 3.051 7.934 3.263 12.158 2.751a29.817 29.817 0 0 0 10.269-2.902 14.398 14.398 0 0 0 7.024-7.588 13.174 13.174 0 0 0-1.056-10.769c-3.73-7.01-11.452-10.605-19.085-11.228a29.812 29.812 0 0 0-21.819 7.163 30.154 30.154 0 0 0-9.888 20.075c-.666 7.996 2.436 15.761 6.96 22.214a84.627 84.627 0 0 0 16.779 17.353 102.473 102.473 0 0 0 42.812 20.191q2.792.577 5.615.988a2.421 2.421 0 0 0 2.883-1.637 2.361 2.361 0 0 0-1.637-2.884Z"
          />
          <path
            fill="#ccc"
            d="M390.233 239.382q-30.663-.433-61.133 1.556c-6.943.454-12.95 2.908-12.95 7.032 0 3.449 5.959 7.489 12.95 7.032q30.455-1.988 61.133-1.556c16.674.235 16.664-13.829 0-14.064Z"
          />
          <path
            fill="#3f3d56"
            d="M360.02 252.75c-2.21 0-54.106-.083-54.106-7.252 0-7.168 51.896-7.25 54.105-7.25s54.106.082 54.106 7.25c0 7.169-51.896 7.251-54.106 7.251Zm-52.077-7.252c1.42 2.174 20.496 5.251 52.076 5.251s50.656-3.077 52.077-5.25c-1.42-2.174-20.497-5.251-52.077-5.251s-50.656 3.078-52.076 5.25ZM524.673 441.2c11.489-.32 25.786-.718 36.801-8.764a28.262 28.262 0 0 0 11.12-21.104c.226-6.354-2.07-11.901-6.464-15.614-5.753-4.861-14.154-6.001-23.207-3.34l9.38-68.549-6.886-.943-11.027 80.587 5.75-2.639c6.666-3.058 15.817-4.614 21.504.192a12.215 12.215 0 0 1 4.005 10.062 21.36 21.36 0 0 1-8.275 15.735c-8.572 6.26-19.968 7.068-32.894 7.43ZM468.203 329.741h37.432v6.95h-37.432z"
          />
          <path
            fill="#2f2e41"
            d="M203.485 302.738a7.012 7.012 0 0 1-6.904-5.918l-2.285-14.581a7.008 7.008 0 0 1 5.833-8l121.531-19.042a7.007 7.007 0 0 1 7.999 5.832l2.285 14.582a7.007 7.007 0 0 1-5.832 8L204.58 302.651a7.096 7.096 0 0 1-1.095.086Z"
          />
          <circle cx="153.189" cy="80.855" r="51" fill="#047857" />
          <path
            fill="#2f2e41"
            d="M182.065 94.05a12.095 12.095 0 0 0 4.367-2.675 8.133 8.133 0 0 0 2.254-6.483 5.472 5.472 0 0 0-2.512-4.165c-1.846-1.135-4.284-1.092-6.747.05l-.284-19.908-2 .028.334 23.404 1.523-.998c1.765-1.156 4.301-1.994 6.126-.872a3.514 3.514 0 0 1 1.573 2.69 6.146 6.146 0 0 1-1.676 4.833c-2.168 2.151-5.377 2.872-9.04 3.531l.355 1.969a32.963 32.963 0 0 0 5.727-1.403ZM189.087 61.084l10.65-1.613.3 1.978-10.65 1.613zM155.47 66.174l10.65-1.613.3 1.978-10.65 1.613zM186.892 301.846a9.03 9.03 0 0 1-8.434-5.855l-35.163-94.169a46.532 46.532 0 0 1 27.284-59.802l28.592-10.676a8.958 8.958 0 0 1 6.878.238 8.832 8.832 0 0 1 4.675 4.986l65.137 122.984a9.002 9.002 0 0 1-5.257 11.638l-80.566 30.084a8.976 8.976 0 0 1-3.146.572Z"
          />
          <path
            fill="#e6e6e6"
            d="m190.496 134.582 64.63 86.426-43.733-85.518a8.079 8.079 0 0 0-10.349-4.846Z"
          />
          <path
            fill="#047857"
            d="m292.828 200.218-115.395-7.434a13.88 13.88 0 1 1 1.784-27.701l115.395 7.433a6.5 6.5 0 0 1 6.07 6.904l-.95 14.729a6.5 6.5 0 0 1-6.904 6.069Z"
          />
          <path
            fill="#2f2e41"
            d="M261.993 204.983q-.229 0-.458-.015l-94.757-6.103a7 7 0 0 1-6.535-7.435l1.62-25.159a7 7 0 0 1 7.436-6.535l94.756 6.103a7.008 7.008 0 0 1 6.535 7.435l-1.62 25.159a7.019 7.019 0 0 1-4.546 6.11 6.926 6.926 0 0 1-2.431.44ZM152.605 46.94c6.709-5.77 15.922-.608 23.616-1.511 7.362-.865 13.174-7.468 14.66-14.483 1.731-8.184-2.516-16.383-8.778-21.486-6.857-5.588-15.952-7.193-24.57-6.159-9.878 1.185-18.911 5.79-27.017 11.359a121.85 121.85 0 0 0-21.442 18.17c-5.75 6.35-10.623 13.922-12.18 22.469-1.413 7.767-.334 16.375 4.258 22.955a24.205 24.205 0 0 0 9.474 7.805c3.938 1.934 8.138 3.316 11.952 5.502 5.768 3.305 11.374 10.159 9.567 17.29a9.793 9.793 0 0 1-2.226 4.19c-1.29 1.434-3.618-.46-2.324-1.896 2.272-2.523 2.183-5.888.972-8.9a16.272 16.272 0 0 0-7.234-7.955c-3.993-2.283-8.401-3.692-12.494-5.771a27.023 27.023 0 0 1-9.911-8.214c-4.898-6.807-6.364-15.666-5.253-23.861 1.202-8.868 5.759-16.927 11.47-23.68 6.217-7.35 13.853-13.571 21.653-19.16 8.37-5.997 17.618-11.067 27.85-12.9 8.87-1.59 18.485-.611 26.242 4.223 7.24 4.512 12.792 12.273 13.344 20.946a22.235 22.235 0 0 1-10.376 19.942 19.101 19.101 0 0 1-11.41 2.644c-4.262-.273-8.527-1.578-12.816-1.216a8.94 8.94 0 0 0-5.268 2.129c-1.466 1.26-3.213-1.181-1.76-2.431Z"
          />
          <path
            fill="#3f3d56"
            d="M739.485 597.175H1.19a1.19 1.19 0 0 1 0-2.381h738.294a1.19 1.19 0 0 1 0 2.381Z"
          />
        </svg>
        <h1 className="text-4xl lg:text-5xl xl:text-6xl text-center md:text-start">
          Take control of your money
        </h1>
        <Spacer />
        {startingPrice && (
          <h2 className="text-lg text-center md:text-start">
            Only {startingPrice} per month
          </h2>
        )}
        <Spacer />
        <Link to="/auth/register" className="btn-primary w-max shadow-lg">
          Start your 45-day free trial
        </Link>
      </div>
    </>
  );
}
