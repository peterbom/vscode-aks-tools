import { SvgProps } from "./svgProps";

export function SubscriptionIcon(props: SvgProps) {
    return (
        <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={props.style}>
            <g>
                <title></title>
                <defs></defs>
                <path
                    fill="url(#bc6cfac5-d635-420b-a78f-e0a4ea9e8018)"
                    d="M13.563 7.187a2.074 2.074 0 0 0 0-2.927L10 .688a2.06 2.06 0 0 0-2.919 0L3.522 4.259a2.075 2.075 0 0 0 0 2.928l2.963 2.971a.581.581 0 0 1 .17.411v5.523a.708.708 0 0 0 .206.5l1.35 1.354a.468.468 0 0 0 .662 0l1.309-1.313v-.013l.772-.773a.271.271 0 0 0 0-.382l-.556-.557a.3.3 0 0 1 0-.417l.556-.557a.271.271 0 0 0 0-.382L10.4 13a.3.3 0 0 1 0-.417l.557-.558a.27.27 0 0 0 0-.381l-.773-.776v-.285zM8.542 1.552A1.175 1.175 0 1 1 7.37 2.727a1.174 1.174 0 0 1 1.172-1.175z"
                ></path>
                <path
                    fill="#ff9300"
                    d="M7.616 16.21a.252.252 0 0 0 .426-.192v-4.469a.268.268 0 0 0-.116-.222.253.253 0 0 0-.39.222v4.469a.268.268 0 0 0 .08.192zM6.006 5.45h5.223a.316.316 0 0 1 .316.316v.059a.317.317 0 0 1-.317.317H6.005a.316.316 0 0 1-.316-.316v-.06a.317.317 0 0 1 .317-.317zm0 1.125h5.223a.316.316 0 0 1 .316.316v.06a.316.316 0 0 1-.316.316H6.006a.317.317 0 0 1-.317-.317v-.058a.317.317 0 0 1 .317-.317z"
                    opacity=".75"
                ></path>
            </g>
            <defs>
                <radialGradient
                    id="bc6cfac5-d635-420b-a78f-e0a4ea9e8018"
                    cx="-36.631"
                    cy="17.122"
                    r="11.178"
                    gradientTransform="matrix(.942 0 0 .944 41.878 -7.403)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset=".266" stopColor="#ffd70f"></stop>
                    <stop offset=".487" stopColor="#ffcb12"></stop>
                    <stop offset=".884" stopColor="#feac19"></stop>
                    <stop offset="1" stopColor="#fea11b"></stop>
                </radialGradient>
            </defs>
        </svg>
    );
}
