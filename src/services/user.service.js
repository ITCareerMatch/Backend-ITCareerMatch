import userRepository from "../repositories/user.repository.js";

class UserService {
  async getUserById(id) {
    return userRepository.findById(id);
  }

  async updateUserById(id, update) {
    return userRepository.updateById(id, update);
  }

  async deleteUserById(id) {
    return userRepository.deleteById(id);
  }
}

export default new UserService();
