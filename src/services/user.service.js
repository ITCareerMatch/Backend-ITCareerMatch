import userRepository from "../repositories/user.repository.js";

class UserService {
  async getUserById(id) {
    return userRepository.findById(id);
  }

  async updateUserById(id, update) {
    return userRepository.updateById(id, update);
  }
}

export default new UserService();
