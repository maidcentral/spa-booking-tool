import { EmbeddableBookingForm } from "@/app/components/booking/EmbeddableBookingForm"
import { AuthenticationProvider } from "@/app/components/booking/AuthenticationProvider"

export default function Home() {
  return (
    <AuthenticationProvider>
      <EmbeddableBookingForm />
    </AuthenticationProvider>
  )
}

export const metadata = {
  title: "Book Your Service - MaidCentral",
  description: "Professional cleaning services booking form",
}
