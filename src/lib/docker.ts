import Docker from 'dockerode';

// Create a singleton Docker client
const docker = new Docker();

export default docker; 