import userService from "../services/user.service.js";

class UserController {
  async getMe(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.updateUserById(userId, req.body, req.file);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async deleteMe(req, res, next) {
    try {
      const userId = req.user.id;
      await userService.deleteUserById(userId);
      res.json({ success: true, message: "Account successfully deleted" });
    } catch (err) {
      next(err);
    }
  }
}

export default new UserController();
