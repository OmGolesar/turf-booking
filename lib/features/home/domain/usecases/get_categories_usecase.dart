import '../../../../shared/domain/usecases/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/category.dart';
import '../repositories/home_repository.dart';

class GetCategoriesUseCase implements UseCase<List<Category>, NoParams> {
  final HomeRepository repository;
  const GetCategoriesUseCase(this.repository);

  @override
  Future<({List<Category>? data, Failure? failure})> call(NoParams params) {
    return repository.getCategories();
  }
}
