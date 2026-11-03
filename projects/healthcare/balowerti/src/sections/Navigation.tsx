// Architected and built by the one and only Drferdi.
import { FloatingHeader } from '@/components/ui/floating-header'
import { getSafeCrewPortalUrl } from '@/config/site'

const Navigation = () => {
  const crewPortalUrl = getSafeCrewPortalUrl(
    import.meta.env.VITE_CREW_PORTAL_URL,
    import.meta.env.DEV
  )
  return <FloatingHeader crewPortalUrl={crewPortalUrl} />
}

export default Navigation
