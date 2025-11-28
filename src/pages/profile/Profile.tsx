import React from 'react'
import useAuthStore from '../../stores/useAuthStore'

const Profile: React.FC = () => {
    const { user } = useAuthStore()

    return (
        <div className="container-page">
            <div >
                <h1>Bienvenido</h1>
                <h2>{user?.displayName}</h2>
            </div>
        </div>
    )
}

export default Profile