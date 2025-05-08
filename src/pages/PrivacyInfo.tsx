import AppHeader from "@/components/AppHeader"
import { type ReactElement } from "react"
import { Link } from "react-router-dom"

export default function PrivacyInfo(): ReactElement {
    return <>
        <AppHeader center={<span className="text-2xl font-bold">Privacy Policy</span>} />
        <div className="bg-background flex flex-col items-start justify-start w-full h-full px-4 py-2 space-y-4">
            <h1 className="text-2xl font-bold">Here's what you need to know:</h1>
            <p>
                Your journal data is stored locally in your browser—nothing is uploaded.
            </p>
            <p>File uploads and parsing happen entirely on your device.</p>
            <p>
                Echo uses OpenAI’s API for AI reflections. This data isn’t used for training and is deleted after 30 days (per OpenAI’s <Link className="link" to={"https://platform.openai.com/docs/guides/your-data"} target="_blank">policy</Link>).
            </p>
        </div>

    </>
}
