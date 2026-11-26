import { useState } from 'react'
import CampaignForm from '../components/CampaignForm'

export default function CreatePage() {
  const [success, setSuccess] = useState(null)

  return (
    <div className="max-w-md mx-auto">
      {success ? (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
          <h2 className="text-lg font-bold text-green-800">Кампания создана!</h2>
          <p className="text-sm text-gray-600 mt-1">ID: {success.campaign_id}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Создать ещё
          </button>
        </div>
      ) : (
        <CampaignForm onSuccess={setSuccess} />
      )}
    </div>
  )
}